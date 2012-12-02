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
  ChannelToken string
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
    LeaveRoom(c, channelParts[0], channelParts[1])
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
      channelToken, err := channel.Create(c, clientId + "@" + roomName)
      if err != nil {
        http.Error(w, "Couldn't create Channel", http.StatusInternalServerError)
        return
      }
      roomList := JoinRoom(c, clientId, roomName);

      roomEmpty := len(roomList) == 1;
      roomFull := len(roomList) > 2;

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
      data := TemplateData{Room:roomName, RoomEmpty: roomEmpty, RoomFull: roomFull, ChannelToken: channelToken, User: userName, LoginLogoutLink: loginLogoutLink, NotViaSlash: notViaSlash, Participants: strings.Join(roomList, "|") }

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

func JoinRoom(c appengine.Context, clientId string, roomName string) []string {
  c.Debugf("JoinRoom")
  roomList := ListRoom(c, roomName)
  for _,id := range roomList {
    if id == clientId {
      return roomList
    }
  }
  roomList = append(roomList, clientId)
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
  c.Debugf("Stored room memcache is: ", roomItem.Value);
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
  c.Debugf("SendJSON %+v",msg)

  item, _ := memcache.Get(c, msg.Room)
  list := strings.Split(string(item.Value),"|")
  if (msg.To == "") {
    for _,id := range list {
      if (msg.From != id) {
        if err := channel.SendJSON(c, id + "@" + msg.Room, msg); err != nil {
          c.Criticalf("send json error ",err)
        }
      }
    }
  } else {
    if err := channel.SendJSON(c, msg.To + "@" + msg.Room, msg); err != nil {
      c.Criticalf("send json error ",err)
    }
  }
}
