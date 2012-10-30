package webrtcing

import (
  "appengine"
  "appengine/channel"
  "appengine/memcache"
  "encoding/json"
  "log"
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
}

func init() {
  now := time.Now()
  rand.Seed(now.Unix())

  http.HandleFunc("/_ah/channel/receive", func (w http.ResponseWriter, r *http.Request) {
    c := appengine.NewContext(r)
    
    client := r.FormValue("key")
    var msg Message
    if err := json.Unmarshal([]byte(r.FormValue("msg")),&msg); err != nil { 
      log.Fatalf("%s",err) 
      return
    }

    log.Print("received channel data: ",r.FormValue("key"), msg)

    switch msg.Type {
    case "join":
      Join(c,"room:"+msg.Data.(string),client)
    case "leave":
      Leave(c,"room:"+msg.Data.(string),client)
    case "offer":
      log.Print("offer")
      data := msg.Data.([]interface{})
      channel.SendJSON(c, data[0].(string), Message{Type: "offer", Data: []string{client,data[1].(string)}})
    case "answer":
      log.Print("answer")
      data := msg.Data.([]interface{})
      channel.SendJSON(c, data[0].(string), Message{Type: "answer", Data: data[1]})
    case "icecandidate":
      log.Print("icecandidate")
      data := msg.Data.([]interface{})
      channel.SendJSON(c, data[0].(string), Message{Type: "icecandidate", Data: []string{data[1].(string),data[2].(string),strconv.FormatFloat(data[3].(float64),'e',-1,64)}})
    }
  })

  /*
   Because we can't know which room a client was in when we
   get the AppEngine Channel "disconnect" we create our own
   which also takes the room name as an argument.

   If we move to another channel (like WebSockets) we should
   do this on a proper connection "close" instead.
  */
  http.HandleFunc("/disconnected", func (w http.ResponseWriter, r *http.Request) {
    c := appengine.NewContext(r)
    room := r.FormValue("room")
    client := r.FormValue("client")
    log.Printf("Disconnecting %s from %s",client, room)
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
  data := RoomData{Room:roomName, ChannelToken: token}

  // Parse the template and output HTML:
  template, err := template.New("test.html").ParseFiles("test.html")
  if err != nil { log.Fatalf("execution failed: %s", err) }
  err = template.Execute(w, data)
  if err != nil { log.Fatalf("execution failed: %s", err) }

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
    log.Print("join, room not found. creating new room")

    // create room, with single client in
    roomItem := &memcache.Item{Key: room, Value: []byte(client)}
    if err := memcache.Set(c,roomItem); err != nil {
      log.Fatalf("join, set error ",err)  
    }
    // let the promote the client (= host)
    channel.SendJSON(c, client, Message{Type: "promoted", Data: client})
  } else if err != nil {
    log.Fatalf("join, get error ",err)
  } else {
    log.Printf("join, found room %s: %s",item.Key,string(item.Value))
    list := ListRoom(c, item, room, client, false);

    if( len(list) > 2 ){
      log.Printf("Room full:",list)
      channel.SendJSON(c, client, Message{Type: "full", Data: len(list)})

    // no need to broadcast (should never happen)
    } else if len(list) == 0 {
      log.Fatalf("No clients in the room (but it should be)")

    // or let the already connected users know
    } else {
      UpdateRoom(c, item, list);
      for _,id := range list {
        if id != client {
          log.Printf("connected(%s) ",id,client)
          channel.SendJSON(c, id, Message{Type: "connected", Data: client})
        }
      }
    }
  }
}

func Leave(c appengine.Context, room string, client string) {
  item, err := memcache.Get(c, room)
  if err == memcache.ErrCacheMiss {
    log.Print("leave, room not found. ")
  } else if err != nil {
    log.Fatalf("leave, error ",err)
  } else {
    log.Printf("leave, found room %s: %s",item.Key,string(item.Value))
    list := ListRoom(c, item, room, client, true);
    UpdateRoom(c, item, list);

    // if room is empty, remove it
    if len(list) == 0 {
      err := memcache.Delete(c, room)
      if err != nil {
        log.Fatalf("leave, error while deleting room",err)
      }

    // or let the already connected users know
    } else {
      for _,id := range list {
        if id != client {
          log.Printf("disconnected(%s) ",id,client)
          channel.SendJSON(c, id, Message{Type: "disconnected", Data: client})
        }
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
    log.Fatalf("UpdateRoom, set error ",err)  
  }
}