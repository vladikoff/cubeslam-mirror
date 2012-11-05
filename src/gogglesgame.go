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
  "strconv"
  "time"
)

type Message struct {
  Type string
  Data interface{}
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

    Join(c,room,from)
  })

  http.HandleFunc("/_ah/channel/disconnected/", func (w http.ResponseWriter, r *http.Request){
    c := appengine.NewContext(r)

    from := r.FormValue("from")
    to := r.FormValue("to") // only populated in production?
    room, client := ParseFrom(from)

    c.Debugf("disconnected from: %s to: %s",from,to)
    c.Debugf("disconnected client: %s to room: %s",client,room)

    Leave(c,room,from)
  })

  http.HandleFunc("/message", func (w http.ResponseWriter, r *http.Request) {
    c := appengine.NewContext(r)
    
    from := r.FormValue("from")
    message := r.FormValue("msg")
    var msg Message
    if err := json.Unmarshal([]byte(message),&msg); err != nil { 
      c.Criticalf("%s",err) 
      return
    }

    c.Debugf("received channel data from: %s message: %+v",from, msg)

    room, client := ParseFrom(from)

    switch msg.Type {
    case "join":
      Join(c,room,from)
    case "leave":
      Leave(c,room,from)
    case "offer":
      c.Debugf("offer")
      data := msg.Data.([]interface{})
      peer := data[0].(string)
      sdp := data[1].(string)
      SendJSON(c, room+"@"+peer, Message{Type: "offer", Data: []string{client,sdp}})
    case "answer":
      c.Debugf("answer")
      data := msg.Data.([]interface{})
      peer := data[0].(string)
      sdp := data[1].(string)
      SendJSON(c, room+"@"+peer, Message{Type: "answer", Data: sdp})
    case "icecandidate":
      c.Debugf("icecandidate")
      data := msg.Data.([]interface{})
      peer := data[0].(string)
      candidate := data[1].(string)
      sdpMid := data[2].(string)
      sdpMLineIndex := strconv.FormatFloat(data[3].(float64),'e',-1,64)
      SendJSON(c, room+"@"+peer, Message{Type: "icecandidate", Data: []string{candidate,sdpMid,sdpMLineIndex}})
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
    c.Debugf("Disconnecting from %s",from)
    room, _ := ParseFrom(from)
    Leave(c, room, from)
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
  token, err := channel.Create(c, roomName+"@"+clientId)
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

func Join(c appengine.Context, room string, from string) {
  room, client := ParseFrom(from)
  item, err := memcache.Get(c, room)
  if err == memcache.ErrCacheMiss {
    c.Debugf("join, room not found. creating new room")

    // create room, with single client in
    roomItem := &memcache.Item{Key: room, Value: []byte(client)}
    if err := memcache.Set(c,roomItem); err != nil {
      c.Criticalf("join, set error ",err)  
    }
    // let the promote the client (= host)
    SendJSON(c, from, Message{Type: "promoted", Data: client})

  } else if err != nil {
    c.Criticalf("join, get error ",err)
  } else {
    c.Debugf("join, found room %s: %s",item.Key,string(item.Value))
    list := ListRoom(c, item, room, client, false);

    if( len(list) > 2 ){
      c.Debugf("Room full:",list)
      SendJSON(c, from, Message{Type: "full", Data: len(list)})

    // no need to broadcast (should never happen)
    } else if len(list) == 0 {
      c.Criticalf("No clients in the room (but it should be)")

    // or let the already connected users know
    } else {
      UpdateRoom(c, item, list);
      for _,id := range list {
        if id != client {
          c.Debugf("connected(%s) ",id,client)
          SendJSON(c, room+"@"+id, Message{Type: "connected", Data: client})
        }
      }
    }
  }
}

func Leave(c appengine.Context, room string, from string) {
  room, client := ParseFrom(from)
  item, err := memcache.Get(c, room)
  if err == memcache.ErrCacheMiss {
    c.Debugf("leave, room not found. ")
  } else if err != nil {
    c.Criticalf("leave, error ",err)
  } else {
    c.Debugf("leave, found room %s: %s",item.Key,string(item.Value))
    list := ListRoom(c, item, room, client, true);
    UpdateRoom(c, item, list);

    // if room is empty, remove it
    if len(list) == 0 {
      err := memcache.Delete(c, room)
      if err != nil {
        c.Criticalf("leave, error while deleting room",err)
      }

    // or let the already connected users know
    } else {
      for _,id := range list {
        if id != client {
          c.Debugf("disconnected(%s) ",id,client)
          SendJSON(c, room+"@"+id, Message{Type: "disconnected", Data: client})
        }
      }

      // only one left, promote that user
      // if len(list) == 1 {
      //   host := list[0]
      //   SendJSON(c, room+"@"+host, Message{Type: "promoted", Data: host})
      // }
    }
  }
}

func ListRoom(c appengine.Context, room *memcache.Item, name string, client string, remove bool) sort.StringSlice {
  list := strings.Split(string(room.Value),"|")
  list = Filter(list,func(str string) bool { return str != client })
  if remove == false {
    list = append(list,client)
  }
  sorted := sort.StringSlice(list)
  sorted.Sort()
  return sorted;
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

func ParseFrom(s string) (string, string) {
  from := strings.Split(s,"@")
  // room, client
  return from[0], from[1];
}

func SendJSON(c appengine.Context, to string, msg Message) {
  c.Debugf("SendJSON (%s) %+v",to,msg)
  if err := channel.SendJSON(c, to, msg); err != nil {
    c.Criticalf("send json error ",err)
  }
}