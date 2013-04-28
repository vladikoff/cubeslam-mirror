package webrtcing

import (
  "appengine"
  "encoding/json"
  "math/rand"
  "net/http"
  "text/template"
  "regexp"
  "strings"
  "strconv"
  "io/ioutil"
  "time"
  "os"
)

type Template struct {
  Room string
  User string
  Token string
  State string
  AcceptLanguage string
  Minified string
  Dev bool
}

func Main(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  w.Header().Set("Content-Type", "text/html; charset=utf-8")

  // redirect to room name
  if r.URL.Path == "/" && !strings.Contains(r.Header.Get("User-Agent"),"facebookexternalhit") {
    roomName := Random(6)
    path := "/"

    // room doesn't exists, redirect to it
    // (or we'll just redirect back to "/")
    if _, err := GetRoom(c, roomName); err != nil {
      path = "/"+roomName
    } else {
      c.Debugf("Room already exist. Generating a random string instead.")
      path = "/"+Random(6)
    }
    if r.URL.RawQuery != "" {
      path = path + "?"+r.URL.RawQuery
    }
    http.Redirect(w, r, path, 302);
    return
  }

  q := r.URL.Query()
  appchan := q.Get("signal") != "ws"

  roomName := strings.TrimLeft(r.URL.Path,"/")
  userName := Random(10)

  // to make sure that players have the same settings
  // in multiplayer we include the query in the room nama
  if r.URL.RawQuery != "" {
    roomName = Cleanup(roomName + "-" + r.URL.RawQuery)
  }

  // Data to be sent to the template:
  data := Template{Room:roomName, User: userName, AcceptLanguage: AcceptLanguage(r), Minified: Minified(), Dev: appengine.IsDevAppServer() }

  // skip rooms when using WebSocket signals
  if appchan {

    room, err := GetRoom(c, roomName)

    // Empty room
    if err != nil {
      room := new(Room)
      // room.AddUser(userName)
      c.Debugf("Created room %s",roomName)
      if err := PutRoom(c, roomName, room); err != nil {
        c.Criticalf("!!! could not save room: %s", err)
        return;
      }
      data.State = "room-empty"

    // Join room
    } else if room.Occupants() == 1 {
      // room.AddUser(userName)
      // c.Debugf("Joined room %s",roomName)
      if err := PutRoom(c, roomName, room); err != nil {
        c.Criticalf("could not save room: %s", err)
        return;
      }
      data.State = "room-lonely"

    // Full room
    } else if room.Occupants() == 2 {
      c.Debugf("Full room %s",roomName)
      data.State = "room-full"

    // DataStore error
    } else if err != nil {
      c.Criticalf("Error occured while getting room %s",roomName,err)
      return;
    }

    // Create a channel token
    signal := new(Signal)
    if err := signal.Init(c, MakeClientId(roomName, userName)); err != nil {
      http.Error(w, "Couldn't create Channel", http.StatusInternalServerError)
      return
    }
    signal.Save(c)
    data.Token = signal.Token
  }

  // Parse the template and output HTML:
  template, err := template.ParseFiles("build/build.html")
  if err != nil { c.Criticalf("execution failed: %s", err) }
  err = template.Execute(w, data)
  if err != nil { c.Criticalf("execution failed: %s", err) }
}

func Tech(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  w.Header().Set("Content-Type", "text/html; charset=utf-8")

  // Data to be sent to the template:
  data := Template{AcceptLanguage: AcceptLanguage(r), Minified: Minified(), Dev: appengine.IsDevAppServer() }

  // Parse the template and output HTML:
  template, err := template.ParseFiles("build/tech.html")
  if err != nil { c.Criticalf("execution failed: %s", err) }
  err = template.Execute(w, data)
  if err != nil { c.Criticalf("execution failed: %s", err) }
}


func AEConnected(w http.ResponseWriter, r *http.Request) {
  // AppEngine Channel API backend is initialized!
  c := appengine.NewContext(r)
  roomName, userName := ParseClientId(r.FormValue("from"))

  c.Debugf("AppEngine connected user %s to room %s",userName,roomName)

  if room, err := GetRoom(c, roomName); err == nil {
    room.AEConnectUser(userName)
    err = PutRoom(c, roomName, room)
    if err != nil {
      c.Criticalf("AEConnected could not put room %s: ",roomName,err)
    }

    if room.Connected(userName) {
      Connected(c, w, r, roomName, userName, room)
    }
  } else {
    c.Criticalf("Could not get room %s: ",roomName,err)
  }
}

func JSConnected(w http.ResponseWriter, r *http.Request) {
  // JavaScript Channel API code is initialized!
  c := appengine.NewContext(r)
  roomName, userName := ParseClientId(r.FormValue("from"))

  c.Debugf("JavaScript connected user %s to room %s",userName,roomName)

  if room, err := GetRoom(c, roomName); err == nil {
    room.JSConnectUser(userName)
    err = PutRoom(c, roomName, room)
    if err != nil {
      c.Criticalf("JSConnected could not put room %s: ",roomName,err)
    }

    if room.Connected(userName) {
      Connected(c, w, r, roomName, userName, room)
    }
  } else {
    c.Criticalf("Could not get room %s: ",roomName,err)
  }
}

func Connected(c appengine.Context, w http.ResponseWriter, r *http.Request, roomName string, userName string, room *Room) {
  c.Debugf("Both AppEngine Channels API backend AND the Javascript Channels API lib are initialized! roomName:" + roomName + " userName:" + userName)

  signal, _ := GetSignal(c, MakeClientId(roomName, userName))

  // send connected to both when room is complete
  if room.Occupants() == 2 {
    otherUser := room.OtherUser(userName)
    otherSignal, _ := GetSignal(c, MakeClientId(roomName, otherUser))
    if err := otherSignal.Send(c, "connected"); err != nil {
      c.Criticalf("Error while sending connected:",err)
    }
    if err := signal.Send(c, "connected"); err != nil {
      c.Criticalf("Error while sending connected:",err)
    }
  } else {
    c.Debugf("Waiting for another user before sending 'connected'")
  }
}

func Disconnected(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  roomName, userName := ParseClientId(r.FormValue("from"))
  if room, err := GetRoom(c, roomName); err == nil {

    if room.HasUser(userName) == false {
      c.Debugf("User %s not found in room %s",userName,roomName)
      return;
    }

    // get the other user before we remove the current one
    otherUser := room.OtherUser(userName)
    empty := room.RemoveUser(userName)
    c.Debugf("Removed user %s from room %s",userName,roomName)

    // delete empty rooms
    if empty {
      err := DelRoom(c, roomName)
      if err != nil {
        c.Criticalf("Could not del room %s: ",roomName,err)
      } else {
        c.Debugf("Removed empty room %s",roomName)
      }

    // save room if not empty
    } else {
      err := PutRoom(c, roomName, room)
      if err != nil {
        c.Criticalf("... Could not put room %s: ",roomName,err)
      } else if otherUser != "" {
        // let the other user know
        signal, _ := GetSignal(c, MakeClientId(roomName, userName))
        otherSignal, _ := GetSignal(c, MakeClientId(roomName, otherUser))
        if err := otherSignal.Send(c, "disconnected"); err != nil {
          c.Criticalf("Error while sending disconnected:",err)
        }
        if err := signal.Send(c, "disconnected"); err != nil {
          c.Criticalf("Error while sending disconnected:",err)
        }
      } else {
        c.Debugf("We should never get here because the room should be empty.")
      }
    }
  } else {
    c.Criticalf("Could not get room %s: ",roomName,err)
  }
}

func Expire(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  w.Header().Set("Content-Type", "text/html; charset=utf-8")

  // Find expired rooms
  rooms, err := ExpiredRooms(c)
  if err != nil {
    c.Criticalf("%s",err)
    return
  }
  c.Debugf("Expired rooms: %v",rooms)

  // Delete the rooms
  if err := DelRooms(c, rooms); err != nil {
    c.Criticalf("%s",err)
    return
  }
  w.Write([]byte("OK"))
}

func Occupants(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  w.Header().Set("Content-Type", "text/html; charset=utf-8")
  total, err := TotalOccupants(c)
  if err != nil {
    c.Criticalf("%s",err)
    return
  }
  totalString := strconv.FormatInt(int64(total),10)
  c.Debugf("Current occupants: %s",totalString)
  w.Write([]byte(totalString))
}

func OnMessage(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)

  roomName, userName := ParseClientId(r.FormValue("from"))

  b, err := ioutil.ReadAll(r.Body);
  if err != nil {
    c.Criticalf("%s",err)
    return
  }
  r.Body.Close()

  msg, err := ReadData(b)
  if err != nil {
    c.Criticalf("Error reading JSON",err)
    return
  }

  c.Debugf("received channel data message: %s",b)

  room, err := GetRoom(c, roomName)
  if err != nil {
    c.Criticalf("Error while retreiving room:",err)
  }
  otherUser := room.OtherUser(userName)
  if jsonmsg, err := json.Marshal(msg); err != nil {
    c.Criticalf("Error when marshaling json:", err)
  } else if otherUser != "" {
    signal, _ := GetSignal(c, MakeClientId(roomName, otherUser))
    if err := signal.Send(c, string(jsonmsg)); err != nil {
      c.Criticalf("Error while sending JSON:",err)
    }
  }

  w.Write([]byte("OK"))
}

func MakeClientId(room string, user string) string {
  return user + "-" + room;
}

func ParseClientId(clientId string) (string, string) {
  from := strings.Split(clientId, "-")
  // room, user
  return from[1], from[0]
}

func AcceptLanguage(r *http.Request) string {
  acceptLanguage := "en"
  if _,ok := r.Header["Accept-Language"]; ok {
    acceptLanguage = strings.Join(r.Header["Accept-Language"], ",")
  }
  // let ?lang override
  q := r.URL.Query()
  if q.Get("lang") != "" {
    acceptLanguage = q.Get("lang")
  }
  return acceptLanguage;
}

func Minified() string {
  // Is minified js newer?
  // TODO there must be a better way?!
  minified := ""
  if mi, err := os.Stat("build/build.min.js"); err == nil {
    if bi, err := os.Stat("build/build.js"); err == nil {
      if mi.ModTime().Unix() > bi.ModTime().Unix() {
        minified = "min."
      }
    }
  }
  return minified
}


func Random(length int) string {
  // only upper case because the link will be upper case when copied
  printables := "ABCDEFGHIJKLMNOPQRSTUVWXYX"
  result := ""
  for i := 0; i < length; i++ {
    pos := rand.Intn(len(printables) - 1)
    result = result + printables[pos:pos + 1]
  }
  return result
}

func ReadData(d []byte) (interface{}, error) {
  var data interface{}
  if err := json.Unmarshal(d, &data); err != nil {
    return data, err
  }
  return data, nil
}

func Cleanup(str string) string {
  re := regexp.MustCompile("[^\\w\\d]+")
  str = re.ReplaceAllLiteralString(str,".")
  return str
}

func init() {
  now := time.Now()
  rand.Seed(now.Unix())
  http.HandleFunc("/", Main)
  http.HandleFunc("/tech", Tech)
  http.HandleFunc("/message", OnMessage)
  http.HandleFunc("/connect", JSConnected)
  http.HandleFunc("/disconnect", Disconnected)
  http.HandleFunc("/_expire", Expire)
  http.HandleFunc("/_occupants", Occupants)
  http.HandleFunc("/_ah/channel/connected/", AEConnected)
  if !appengine.IsDevAppServer() {
    // This fires too early in the development environment.
    http.HandleFunc("/_ah/channel/disconnected/", Disconnected)
  } else {
    // to avoid creating rooms in dev mode
    http.HandleFunc("/_ah/channel/disconnected/", func(w http.ResponseWriter, r *http.Request){
      w.Write([]byte("OK"))
    })

  }
}
