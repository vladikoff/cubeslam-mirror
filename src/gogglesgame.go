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
  "time"
)

type Message struct {
  Room string
  To string
  From string
  Type string
  Data string
}

type TemplateData struct {
  Room string
  RoomEmpty bool
  RoomFull bool
  NotViaSlash bool
  User string
  Participants string
  LoginLogoutLink string
}

func init() {
  now := time.Now()
  rand.Seed(now.Unix())

  http.HandleFunc("/_ah/channel/connected/", func (w http.ResponseWriter, r *http.Request){
    c := appengine.NewContext(r)
    c.Debugf("Connected to Channel API")
  })

  http.HandleFunc("/_ah/channel/disconnected/", func (w http.ResponseWriter, r *http.Request){
    c := appengine.NewContext(r)
    channelParts := strings.Split(r.FormValue("from"), "@")

    // Check if the latest channel name for this name/room combination is the one that disconnected.
    cnItem, err := memcache.Get(c, "cn-" + channelParts[0] + "@" + channelParts[1])
    if err != memcache.ErrCacheMiss && string(cnItem.Value) == channelParts[2] {
      // It was the latest channel that disconnected.
      LeaveRoom(c, channelParts[0], channelParts[1])
    } else {
      c.Debugf("Too late disconnect was avoided.")
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

  http.HandleFunc("/channeltoken", func (w http.ResponseWriter, r *http.Request) {
    c := appengine.NewContext(r)
    w.Header().Set("Content-Type", "application/json; charset=utf-8")
    roomName := r.FormValue("roomName")
    clientId := r.FormValue("clientId")
    channelToken, err := channel.Create(c, ChannelName(c, clientId, roomName, true))
    if err != nil {
      http.Error(w, "Couldn't create Channel", http.StatusInternalServerError)
      return
    }
    w.Write([]byte("{\"token\": \"" + channelToken + "\"}"))
  })

  http.HandleFunc("/", func (w http.ResponseWriter, r *http.Request) {

    c := appengine.NewContext(r)

    w.Header().Set("Content-Type", "text/html; charset=utf-8")

    if r.URL.Path == "/" {
      newRoom := Random(12)
      viaSlashCookie := http.Cookie{Name: "viaSlash", Value: newRoom}
      http.SetCookie(w, &viaSlashCookie)
      http.Redirect(w, r, "/"+newRoom, 302);
    } else {

      roomName := r.URL.Path
      clientId := ClientId(r)

      roomList := JoinRoom(c, clientId, roomName);

      roomEmpty := len(roomList) == 1;
      roomFull := len(roomList) > 2;

      // Redirect on full game room.
      if roomFull == true {

        newRoom := Random(12);

        roomFullCookie := http.Cookie{Name: "roomFullCookie", Value: newRoom}
        http.SetCookie(w, &roomFullCookie)

        LeaveRoom(c, roomName, clientId)

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

      // Google Login
      currentUser := user.Current(c);
      loginLogoutLink := ""
      userName := ""
      if currentUser == nil {
        loginLogoutLink, _ = user.LoginURL(c, "/")
      } else {
        loginLogoutLink, _ = user.LogoutURL(c, "/")
        userName = currentUser.String()
      }

      // Did we get redirected to here?
      notViaSlash := true
      viaSlashCookie, _ := r.Cookie("viaSlash")
      if viaSlashCookie != nil {
        if viaSlashCookie.Value == roomName || "/" + viaSlashCookie.Value == roomName {
          notViaSlash = false
        }
      }

      // Data to be sent to the template:
      data := TemplateData{Room:roomName, RoomEmpty: roomEmpty, RoomFull: roomFull, User: userName, LoginLogoutLink: loginLogoutLink, NotViaSlash: notViaSlash, Participants: strings.Join(roomList, "|") }

      // set the clientId cookie:
      cookie := http.Cookie{Name: "clientId", Value: clientId}
      http.SetCookie(w, &cookie)

      // Parse the template and output HTML:
      template, err := template.New("template.html").ParseFiles("template.html")
      if err != nil { c.Criticalf("execution failed: %s", err) }
      err = template.Execute(w, data)
      if err != nil { c.Criticalf("execution failed: %s", err) }
 
    }
  })

}

func ChannelName(c appengine.Context, clientId string, roomName string, forceNew bool) string {
  var cnRand string
  cnItem, err := memcache.Get(c, "cn-" + clientId + "@" + roomName)
  if forceNew || err == memcache.ErrCacheMiss {
    cnRand = Random(12)
    cnItem := &memcache.Item{Key: "cn-" + clientId + "@" + roomName, Value: []byte(cnRand)}
    if err := memcache.Set(c, cnItem); err != nil {
      c.Criticalf("Failed when storing Channel Name")
    }
  } else {
    cnRand = string(cnItem.Value)
  }
//  c.Debugf("Channel name: ", clientId + "@" + roomName + "@" + cnRand)
  return clientId + "@" + roomName + "@" + cnRand
}

func JoinRoom(c appengine.Context, clientId string, roomName string) []string {
  c.Debugf("JoinRoom(*, " + clientId + ", " + roomName + ")")
  roomList := ListRoom(c, roomName)
  for _,id := range roomList {
    if id == clientId {
      c.Debugf("Already in list, did not join.");
      return roomList
    }
  }
  c.Debugf("Before append ", roomList)
  roomList = append(roomList, clientId)
  c.Debugf("Appended new client ", clientId, " into ", roomList)
  StoreRoom(c, roomName, roomList)
  return roomList
}

func LeaveRoom(c appengine.Context, clientId string, roomName string) []string {
  c.Debugf("LeaveRoom")
  roomList := ListRoom(c, roomName)
  roomList = Filter(roomList, func(str string) bool { return str != clientId && str != "" })
  StoreRoom(c, roomName, roomList)
  return roomList
}

func ListRoom(c appengine.Context, roomName string) []string {
  c.Debugf("ListRoom")
  roomItem, err := memcache.Get(c, roomName)
  if err == memcache.ErrCacheMiss {
    return []string{}
  }
  c.Debugf("Stored room memcache is: ", string(roomItem.Value));
  roomList := strings.Split(string(roomItem.Value), "|");
  roomList = Filter(roomList, func(str string) bool { return str != "" })
  return roomList
}

func StoreRoom(c appengine.Context, roomName string, roomList []string) {
  c.Debugf("StoreRoom")
  roomItem := &memcache.Item{Key: roomName, Value: []byte(strings.Join(roomList, "|"))}
  if err := memcache.Set(c, roomItem); err != nil {
    c.Criticalf("memcache error ",err)
  }
  for _, id := range roomList {
    SendJSON(c, Message{Room: roomName, To: id, Type: "participants", Data: strings.Join(roomList,"|")})
  }
}

func ClientId(r *http.Request) string {
  clientIdCookie, _ := r.Cookie("clientId")
  clientId := ""
  if clientIdCookie == nil {
    clientId = Random(10)
  } else {
    clientId = clientIdCookie.Value
  }
  return clientId
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

func SendJSON(c appengine.Context, msg Message) {
  item, _ := memcache.Get(c, msg.Room)
  list := strings.Split(string(item.Value),"|")
  if (msg.To == "") {
    for _,id := range list {
      if (msg.From != id) {
        msg.To = id
        if err := channel.SendJSON(c, ChannelName(c, id, msg.Room, false), msg); err != nil {
          c.Criticalf("send json error ",err)
        } else {
          c.Debugf("SendJSON %+v",msg)
        }
      }
    }
  } else {
    if err := channel.SendJSON(c, ChannelName(c, msg.To, msg.Room, false), msg); err != nil {
      c.Criticalf("send json error ",err)
    } else {
      c.Debugf("SendJSON %+v",msg)
    }
  }
}
