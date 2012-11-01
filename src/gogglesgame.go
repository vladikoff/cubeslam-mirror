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

  var maxMem int64 = 1024*1024*10

  http.HandleFunc("/_ah/channel/connected/", func (w http.ResponseWriter, r *http.Request){
    c := appengine.NewContext(r)

    if err := r.ParseMultipartForm(maxMem); err != nil {
      c.Criticalf("error while parsing form",err)
    }

    c.Debugf("connected %v",r)
  })

  http.HandleFunc("/_ah/channel/disconnected/", func (w http.ResponseWriter, r *http.Request){
    c := appengine.NewContext(r)

    if err := r.ParseMultipartForm(maxMem); err != nil {
      c.Criticalf("error while parsing form",err)
    }

    c.Debugf("disconnected %v",r)
  })

  http.HandleFunc("/message", func (w http.ResponseWriter, r *http.Request) {
    c := appengine.NewContext(r)
    
    client := r.FormValue("client")
    message := r.FormValue("msg")
    var msg Message
    if err := json.Unmarshal([]byte(message),&msg); err != nil { 
      c.Criticalf("%s",err) 
      return
    }

    c.Debugf("received channel data: ",r.FormValue("key"), msg)

    switch msg.Type {
    case "join":
      Join(c,"room:"+msg.Data.(string),client)
    case "leave":
      Leave(c,"room:"+msg.Data.(string),client)
    case "offer":
      c.Debugf("offer")
      data := msg.Data.([]interface{})
      SendJSON(c, data[0].(string), Message{Type: "offer", Data: []string{client,data[1].(string)}})
    case "answer":
      c.Debugf("answer")
      data := msg.Data.([]interface{})
      SendJSON(c, data[0].(string), Message{Type: "answer", Data: data[1]})
    case "icecandidate":
      c.Debugf("icecandidate")
      data := msg.Data.([]interface{})
      SendJSON(c, data[0].(string), Message{Type: "icecandidate", Data: []string{data[1].(string),data[2].(string),strconv.FormatFloat(data[3].(float64),'e',-1,64)}})
    }
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
    room := r.FormValue("room")
    client := r.FormValue("client")
    c.Debugf("Disconnecting %s from %s",client, room)
    Leave(c, "room:"+room, client)
  })


  http.HandleFunc("/", func (w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    if r.URL.Path == "/" {
      http.Redirect(w, r, "/"+randStr(), 302);
    } else {
      Room(w, r);
    }
  })
}

func randStr() string {
  printables := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYX0123456789"
  result := ""
  for i := 0; i < 12; i++ {
    pos := rand.Intn(len(printables) - 1)
    result = result + printables[pos:pos + 1]
  }
  return result
}


func Room(w http.ResponseWriter, r *http.Request) {
  roomName := r.URL.Path
  c := appengine.NewContext(r)
  clientId := randStr()
  token, err := channel.Create(c, clientId)
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

func Filter(s []string, fn func(string) bool) []string {
  var p []string // == nil
  for _, i := range s {
    if fn(i) {
      p = append(p, i)
    }
  }
  return p
}

func Join(c appengine.Context, room string, client string) {
  item, err := memcache.Get(c, room)
  if err == memcache.ErrCacheMiss {
    c.Debugf("join, room not found. creating new room")

    // create room, with single client in
    roomItem := &memcache.Item{Key: room, Value: []byte(client)}
    if err := memcache.Set(c,roomItem); err != nil {
      c.Criticalf("join, set error ",err)  
    }
    // let the promote the client (= host)
    SendJSON(c, client, Message{Type: "promoted", Data: client})

  } else if err != nil {
    c.Criticalf("join, get error ",err)
  } else {
    c.Debugf("join, found room %s: %s",item.Key,string(item.Value))
    list := ListRoom(c, item, room, client, false);

    if( len(list) > 2 ){
      c.Debugf("Room full:",list)
      SendJSON(c, client, Message{Type: "full", Data: len(list)})

    // no need to broadcast (should never happen)
    } else if len(list) == 0 {
      c.Criticalf("No clients in the room (but it should be)")

    // or let the already connected users know
    } else {
      UpdateRoom(c, item, list);
      for _,id := range list {
        if id != client {
          c.Debugf("connected(%s) ",id,client)
          SendJSON(c, id, Message{Type: "connected", Data: client})
        }
      }
    }
  }
}

func SendJSON(c appengine.Context, to string, msg Message) {
  c.Debugf("SendJSON (%s) %v",to,msg)
  if err := channel.SendJSON(c, to, msg); err != nil {
    c.Criticalf("send json error ",err)
  }
}

func Leave(c appengine.Context, room string, client string) {
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
          SendJSON(c, id, Message{Type: "disconnected", Data: client})
        }
      }

      // only one left, promote that user
      if len(list) == 1 {
        host := list[0]
        SendJSON(c, host, Message{Type: "promoted", Data: host})
      }
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