package webrtcing

import (
  "appengine"
  "appengine/channel"
  "appengine/memcache"
  "appengine/user"
  "encoding/json"
  "math/rand"
  "net/http"
  "text/template"
  "strings"
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
  RoomEmpty bool
  RoomFull bool
  NotViaSlash bool
  ChannelToken string
  User string
  LoginLogoutLink string
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

    cn := ChannelName(c, client, room, false)
    c.Debugf("Current channel is %s", cn)
    if cn == r.FormValue("from") { // If Channel name still is the same (that is: the user did not reload & got another session)
      Leave(c,Message{Room:room,From:client})
    }
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
    newRoom := Random(12)
    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    if r.URL.Path == "/" {
      viaSlashCookie := http.Cookie{Name: "viaSlash", Value: newRoom}
      http.SetCookie(w, &viaSlashCookie)
      http.Redirect(w, r, "/"+newRoom, 302);
    } else {
      Room(c, w, r);
    }
  })
}

// This must be made different when running on multiple servers:
// This is a solution on that the onopen even does not fire on dev_appengine.py on reloads.
// On share AppEngine, we can probably just return clientid + "@" + roomName, but that is untested yet.
//var ChannelNames = map[string]string{}
func ChannelName(c appengine.Context, clientId string, roomName string, createNew bool) string {
  /*
  if createNew == true {
    ChannelNames[clientId + "@" + roomName] = Random(12)
    c.Debugf("Created a new channel: %s", clientId + "@" + roomName + "@" + ChannelNames[clientId + "@" + roomName])
  } else {
    if _,ok := ChannelNames[clientId + "@" + roomName]; ok == false {
      c.Debugf("Channel mapping does not exist: %s", clientId + "@" + roomName);
      ChannelNames[clientId + "@" + roomName] = Random(12)
      c.Debugf("Created a new channel: %s", clientId + "@" + roomName + "@" + ChannelNames[clientId + "@" + roomName])
    }
  }
  c.Debugf("%s", ChannelNames);
  return clientId + "@" + roomName + "@" + ChannelNames[clientId + "@" + roomName];
  */
  return clientId + "@" + roomName;
}

func Room(c appengine.Context, w http.ResponseWriter, r *http.Request) {
  roomName := r.URL.Path
  clientIdCookie, _ := r.Cookie("clientId")
  clientId := ""
  c.Debugf("clientIdCookie = %s", clientIdCookie)
  if clientIdCookie == nil {
    clientId = Random(10)
  } else {
    clientId = clientIdCookie.Value
  }

  token, err := channel.Create(c, ChannelName(c, clientId, roomName, true))
  if err != nil {
    http.Error(w, "Couldn't create Channel", http.StatusInternalServerError)
    return
  }

  roomEmpty := true;
  roomFull := false;

  item, err := memcache.Get(c, roomName)
  if err != memcache.ErrCacheMiss {
    list := strings.Split(string(item.Value),"|")
    counter := 0
    for _, roomParticipant := range list {
      if roomParticipant != clientId {
        counter = counter + 1;
      } else {
        c.Debugf("This user is already in the room: " + roomParticipant)
        // This happends when the channel api disconnect fires after for example a reload.
        // Hence, send the promotes/demotes again, so client does not wait for them:
        SendPromotesDemotes(c, roomName, list)
      }
    }

    c.Debugf("Current list in this room: %s", list)
    if counter > 0 {
      roomEmpty = false;
    }
    if counter > 1 {
      roomFull = true;
    }
  }

  // Redirect on full game room.
  if roomFull == true {

    newRoom := Random(12);

    roomFullCookie := http.Cookie{Name: "roomFullCookie", Value: newRoom}
    http.SetCookie(w, &roomFullCookie)

    http.Redirect(w, r, "/"+newRoom, 302);
    return
  }

  // Set the roomFull variable on wheather we were redirected to here from a full room:
  fullCookie, _ := r.Cookie("roomFullCookie")
  if fullCookie != nil {
    if fullCookie.Value == roomName || "/" + fullCookie.Value == roomName {
      roomFull = true
    }
    // If the room full cookie exists, always delete it!
    roomFullCookie := http.Cookie{Name: "roomFullCookie", Value: ""}
    http.SetCookie(w, &roomFullCookie)
  }

  currentUser := user.Current(c);
  loginLogoutLink := ""
  userName := ""
  if currentUser == nil {
    loginLogoutLink, _ = user.LoginURL(c, "/")
  } else {
    loginLogoutLink, _ = user.LogoutURL(c, "/")
    userName = currentUser.String()
  }
  c.Debugf("%s", loginLogoutLink)
  c.Debugf("%s", loginLogoutLink)

  notViaSlash := true
  viaSlashCookie, _ := r.Cookie("viaSlash")
  if viaSlashCookie != nil {
    if viaSlashCookie.Value == roomName || "/" + viaSlashCookie.Value == roomName {
      notViaSlash = false
    }
  }

  // Data to be sent to the template:
  data := RoomData{Room:roomName, RoomEmpty: roomEmpty, RoomFull: roomFull, ChannelToken: token, User: userName, LoginLogoutLink: loginLogoutLink, NotViaSlash: notViaSlash}

  // clientId cookie:
  cookie := http.Cookie{Name: "clientId", Value: clientId}
  http.SetCookie(w, &cookie)

  // Parse the template and output HTML:
  template, err := template.New("template.html").ParseFiles("template.html")
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

    SendPromotesDemotes(c, msg.Room, []string { msg.From })

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
    SendPromotesDemotes(c, msg.Room, list)
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
    }

    // if room is empty, remove it
    if len(list) == 0 {
      err := memcache.Delete(c, msg.Room)
      if err != nil {
        c.Criticalf("leave, error while deleting room",err)
      }
    }
    SendPromotesDemotes(c, msg.Room, list)
  }
}

func SendPromotesDemotes(c appengine.Context, room string, list []string) {
  // First item in the array is always the host (the first connected). Rest are slaves (should be maximum one, normally).
  promoted := false
  for _, id := range list {
    if (!promoted) {
      promoted = true
      c.Debugf("Promoting %s ",id)
      SendJSON(c, Message{Room: room, To: id, Type: "promoted", Data: id})
    } else {
      c.Debugf("Demoting %s ",id)
      SendJSON(c, Message{Room: room, To: id, Type: "demoted", Data: id})
    }
  }
}


func ListRoom(c appengine.Context, room *memcache.Item, client string, remove bool) ([]string, bool) {
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

  if found == false {
    list = append(list,client)
  }

  if remove == true {
    list = Filter(list,func(str string) bool { return str != client })
  }

  return list, found;
}

func UpdateRoom(c appengine.Context, room *memcache.Item, list []string) {
  item := &memcache.Item{Key: room.Key, Value: []byte(strings.Join(list,"|"))}
  if err := memcache.Set(c,item); err != nil {
    c.Criticalf("UpdateRoom, set error ",err)
  }
}

func Random(length int) string {
  printables := "ABCDEFGHIJKLMNOPQRSTUVWXYX0123456789"
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

  item, _ := memcache.Get(c, msg.Room)
  list := strings.Split(string(item.Value),"|")
  if (msg.To == "") {
    for _,id := range list {
      if (msg.From != id) {
        if err := channel.SendJSON(c, ChannelName(c, id, msg.Room, false), msg); err != nil {
          c.Criticalf("send json error ",err)
        }
      }
    }
  } else {
    if err := channel.SendJSON(c, ChannelName(c, msg.To, msg.Room, false), msg); err != nil {
      c.Criticalf("send json error ",err)
    }
  }
}
