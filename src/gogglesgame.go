package webrtcing

import (
  "appengine"
  "appengine/channel"
  "appengine/memcache"
  "encoding/json"
  "math/rand"
  "net/http"
  "text/template"
  "strings"
  "sort"
  "io/ioutil"
  // "strconv"
  "time"
)

/*
Message{
  Room: 'room',
  To: null/'peer',
  From: 'client',
  Type: "event"/"leave"/"offer"/"answer"/"icecandidate",
  Data: '{"type":"offer","sdp":"xyz"}'
}
*/

type Message struct {
  Room string
  To string
  From string
  Type string
  Data string
}

type RoomData struct {
  Room string
  ChannelToken string
  ClientId string
}

func init() {
  now := time.Now()
  rand.Seed(now.Unix())

  http.HandleFunc("/_ah/channel/connected/", func (w http.ResponseWriter, r *http.Request){
    c := appengine.NewContext(r)

    from := r.FormValue("from")
    to := r.FormValue("to") // only populated in production?
    room, client := ParseFrom(from)

    c.Debugf("connected from: %s to: %s",from,to)
    c.Debugf("connected client: %s to room: %s",client,room)

    Join(c,Message{Room:room,From:client})
  })

  http.HandleFunc("/_ah/channel/disconnected/", func (w http.ResponseWriter, r *http.Request){
    c := appengine.NewContext(r)

    from := r.FormValue("from")
    room, client := ParseFrom(from)

    c.Debugf("Disconnecting (channel) from %s",from)

    // c.Debugf("Ignoring channel disconnect.")
    Leave(c,Message{Room:room,From:client})
  })

  http.HandleFunc("/message", func (w http.ResponseWriter, r *http.Request) {
    c := appengine.NewContext(r)

    b, err := ioutil.ReadAll(r.Body)
    if err != nil {
      c.Criticalf("%s",err) 
      return
    }
    r.Body.Close()

    c.Debugf("received channel data message: %s",b)

    var message Message
    if err := json.Unmarshal(b, &message); err != nil { 
      c.Criticalf("%s",err) 
      return
    }

    c.Debugf("%s",message.Type)
    switch message.Type {
    case "join":
      Join(c, message)
    case "leave":
      Leave(c, message)
    case "event", "offer", "answer", "icecandidate":
      SendJSON(c, message)
    }

    w.Write([]byte("OK"))
  })

  /*
   Because we can't know which room a client was in when we
   get the AppEngine Channel "disconnect" we create our own
   which also takes the room name as an argument.

   If we move to another channel (like WebSockets) we should
   do this on a proper connection "close" instead.
  */
  http.HandleFunc("/disconnect", func (w http.ResponseWriter, r *http.Request) {
    c := appengine.NewContext(r)
    from := r.FormValue("from")
    c.Debugf("Disconnecting (onunload) from %s",from)
    room, client := ParseFrom(from)
    Leave(c, Message{Room:room,From:client})
  })


  http.HandleFunc("/", func (w http.ResponseWriter, r *http.Request) {
    c := appengine.NewContext(r)
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    if r.URL.Path == "/" {
      http.Redirect(w, r, "/"+Random(12), 302);
    } else {
      Room(c, w, r);
    }
  })
}


func Room(c appengine.Context, w http.ResponseWriter, r *http.Request) {
  roomName := r.URL.Path
  clientId := Random(10)
  token, err := channel.Create(c, clientId+"@"+roomName)
  if err != nil {
    http.Error(w, "Couldn't create Channel", http.StatusInternalServerError)
    return
  }

  // Data to be sent to the template:
  data := RoomData{Room:roomName, ChannelToken: token, ClientId: clientId}

  // Parse the template and output HTML:
  template, err := template.New("test.html").ParseFiles("test.html")
  if err != nil { c.Criticalf("execution failed: %s", err) }
  err = template.Execute(w, data)
  if err != nil { c.Criticalf("execution failed: %s", err) }

}

func Join(c appengine.Context, msg Message) {
  item, err := memcache.Get(c, msg.Room)
  if err == memcache.ErrCacheMiss {
    c.Debugf("join, room not found. creating new room")

    // create room, with single client in
    roomItem := &memcache.Item{Key: msg.Room, Value: []byte(msg.From)}
    if err := memcache.Set(c,roomItem); err != nil {
      c.Criticalf("join, set error ",err)  
    }
    // let the promote the client (= host)
    SendJSON(c, Message{Room: msg.Room, To: msg.From, Type: "promoted", Data: msg.From})

  } else if err != nil {
    c.Criticalf("join, get error ",err)
  } else {
    c.Debugf("join, found room %s: %s",item.Key,string(item.Value))
    list, _ := ListRoom(c, item, msg.From, false);

    if( len(list) > 2 ){
      c.Debugf("Room full:",list)
      SendJSON(c, Message{Room: msg.Room, To: msg.From, Type: "full", Data: string(len(list))})

    // no need to broadcast (should never happen)
    } else if len(list) == 0 {
      c.Criticalf("No clients in the room (but it should be)")

    // or let the already connected users know
    } else {
      UpdateRoom(c, item, list);
      for _,id := range list {
        if id != msg.From {
          c.Debugf("connected(%s => %s)",id,msg.From)
          SendJSON(c, Message{Room: msg.Room, To: id, Type: "connected", Data: msg.From})
        }
      }
    }
  }
}

func Leave(c appengine.Context, msg Message) {
  item, err := memcache.Get(c, msg.Room)
  if err == memcache.ErrCacheMiss {
    c.Debugf("leave, room not found. ")
  } else if err != nil {
    c.Criticalf("leave, error ",err)
  } else {
    c.Debugf("leave, found room %s: %s",item.Key,string(item.Value))
    list, found := ListRoom(c, item, msg.From, true);
    UpdateRoom(c, item, list);

    // then let the already connected users know
    if( found ){
      for _,id := range list {
        if id != msg.From {
          c.Debugf("disconnected %s => %s ",id,msg.From)
          SendJSON(c, Message{Room: msg.Room, To: id, Type: "disconnected", Data: msg.From})
        }
      }

    } else {
      c.Debugf("tried to leave room (%s) client (%s) was never in",msg.Room, msg.From)
    }

    // if room is empty, remove it
    if len(list) == 0 {
      err := memcache.Delete(c, msg.Room)
      if err != nil {
        c.Criticalf("leave, error while deleting room",err)
      }

    // only one left, promote that user
    } else if len(list) == 1 {
      host := list[0]
      SendJSON(c, Message{Room: msg.Room, To: host, Type: "promoted", Data: host})
    }
  }
}

func ListRoom(c appengine.Context, room *memcache.Item, client string, remove bool) (sort.StringSlice, bool) {
  list := strings.Split(string(room.Value),"|")

  // check if the user was in the room already
  found := false
  for _,id := range list {
    c.Debugf("checking if %s==%s",id,client)
    if id == client {
      found = true
      break
    }
  }

  list = Filter(list,func(str string) bool { return str != client })
  if remove == false {
    list = append(list,client)
  }
  sorted := sort.StringSlice(list)
  sorted.Sort()
  return sorted, found;
}

func UpdateRoom(c appengine.Context, room *memcache.Item, list []string) {
  item := &memcache.Item{Key: room.Key, Value: []byte(strings.Join(list,"|"))}
  if err := memcache.Set(c,item); err != nil {
    c.Criticalf("UpdateRoom, set error ",err)  
  }
}

func Random(length int) string {
  printables := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYX0123456789"
  result := ""
  for i := 0; i < length; i++ {
    pos := rand.Intn(len(printables) - 1)
    result = result + printables[pos:pos + 1]
  }
  return result
}

func Filter(s []string, fn func(string) bool) []string {
  var p []string // == nil
  for _, i := range s {
    if fn(i) {
      p = append(p, i)
    }
  }
  return p
}

func ReadData(c appengine.Context, m Message) (interface{}) {
  var data interface{}
  if err := json.Unmarshal([]byte(m.Data), &data); err != nil { 
    c.Criticalf("%s",err) 
    return data
  }
  return data
}

func ParseFrom(s string) (string, string) {
  from := strings.Split(s,"@")
  // client, room
  return from[1], from[0];
}

func SendJSON(c appengine.Context, msg Message) {
  c.Debugf("SendJSON %+v",msg)
  if err := channel.SendJSON(c, msg.To+"@"+msg.Room, msg); err != nil {
    c.Criticalf("send json error ",err)
  }
}