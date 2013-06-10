package rtc

import (
  "appengine"
  "appengine/channel"
  "encoding/json"
  "encoding/base64"
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
  Version string
}

func Main(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  h := w.Header()
  h.Set("Content-Type", "text/html; charset=utf-8")
  h.Set("Cache-Control", "private, max-age=0, must-revalidate")

  c.Debugf("Headers: %v",r.Header)

  // redirect to room name
  if r.URL.Path == "/" && !SkipRedirect(r) {
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

  // to make sure that players have the same settings
  // in multiplayer we include the query in the room name
  if r.URL.RawQuery != "" {
    roomName = Cleanup(roomName + "-" + r.URL.RawQuery)
  }

  // Data to be sent to the template:
  data := Template{Room:roomName, AcceptLanguage: AcceptLanguage(r), Minified: Minified(), Dev: appengine.IsDevAppServer(), Version: appengine.VersionID(c) }

  // skip rooms when using WebSocket signals
  // or when room name is empty
  if roomName == "" {
    c.Debugf("Room with no name.")
    data.State = "room-empty"

  } else if appchan {
    room, err := GetRoom(c, roomName)

    // Empty room
    if room == nil {
      room = new(Room)
      c.Debugf("Created room %s",roomName)
      if err := PutRoom(c, roomName, room); err != nil {
        c.Criticalf("Error occured while creating room %s: %+v", roomName, err)
        return;
      }
      data.State = "room-empty"

    // Lonely room
    } else if room.Occupants() == 1 {
      data.State = "room-lonely"

    // Full room
    } else if room.Occupants() == 2 {
      data.State = "room-full"

    // DataStore error
    } else if err != nil {
      c.Criticalf("Error occured while getting room %s: %+v",roomName,err)
      return;
    }
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

func AppCache(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  w.Header().Set("Content-Type", "text/cache-manifest")
  w.Header().Set("Cache-Control", "private, max-age=0, must-revalidate")

  // Data to be sent to the template:
  data := Template{ Version: appengine.VersionID(c) }

  // Parse the template and output HTML:
  template, err := template.ParseFiles("support/manifest.appcache.skel")
  if err != nil { c.Criticalf("execution failed: %s", err) }
  err = template.Execute(w, data)
  if err != nil { c.Criticalf("execution failed: %s", err) }
}

func OnToken(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  roomName := r.FormValue("room")
  if roomName != "" {
    userName := Random(10)
    clientId := MakeClientId(roomName, userName)
    token, err := channel.Create(c, clientId)
    if err != nil {
      c.Criticalf("Error while creating token: %s", err)
    }
    w.Write([]byte("user="+userName+"&token="+token))
  } else {
    w.WriteHeader(http.StatusBadRequest)
  }
}

func OnConnect(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  roomName, userName := ParseClientId(r.FormValue("from"))

  c.Debugf("Connected user %s to room %s",userName,roomName)

  if room, err := GetRoom(c, roomName); err == nil {

    // see if user is in room
    if room.HasUser(userName) {
      c.Debugf("User already in room")
      // user already in the room
      // just send "connected" again in
      // case it was missed last time

    // or see if it's full
    } else if room.Occupants() == 2 {
      c.Debugf("Room Full, sending 'full' to %s",userName)
      if err := channel.Send(c, MakeClientId(roomName, userName), "full"); err != nil {
        c.Criticalf("OnConnect: Error while sending full:",err)
      }
      return;

    // or add a user to the room
    } else {
      room.AddUser(userName)
      err = PutRoom(c, roomName, room)
      if err != nil {
        c.Criticalf("OnConnect: Connected could not put room %s: ",roomName,err)
        return
      }
    }

    // send connected to both when room is complete
    if room.Occupants() == 2 {
      otherUser := room.OtherUser(userName)
      c.Debugf("Room Complete, sending 'connected' to %s and %s",userName,otherUser)
      if err := channel.Send(c, MakeClientId(roomName, otherUser), "connected"); err != nil {
        c.Criticalf("OnConnect: Error while sending connected:",err)
      }
      if err := channel.Send(c, MakeClientId(roomName, userName), "connected"); err != nil {
        c.Criticalf("OnConnect: Error while sending connected:",err)
      }
    } else {
      c.Debugf("Waiting for another user before sending 'connected'")
    }

  } else {
    c.Criticalf("OnConnect: Could not get room %s: ",roomName,err)
  }
}

func OnDisconnect(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)
  roomName, userName := ParseClientId(r.FormValue("from"))
  if room, err := GetRoom(c, roomName); err == nil {

    if room.HasUser(userName) == false {
      c.Debugf("OnDisconnect: User %s not found in room %s",userName,roomName)
      return;
    }

    // get the other user before we remove the current one
    otherUser := room.OtherUser(userName)
    empty := room.RemoveUser(userName)
    c.Debugf("OnDisconnect: Removed user %s from room %s",userName,roomName)

    err := PutRoom(c, roomName, room)
    if err != nil {
      c.Criticalf("OnDisconnect: Could not put room %s: ",roomName,err)
      return;
    }

    if empty {
      c.Debugf("OnDisconnect: Room is now empty.")

    } else if otherUser != "" {
      c.Debugf("Removed %s. Sending 'disconnected' to %s",userName,MakeClientId(roomName, otherUser))
      if err := channel.Send(c, MakeClientId(roomName, otherUser), "disconnected"); err != nil {
        c.Criticalf("OnDisconnect: Error while sending 'disconnected':",err)
      }
      c.Debugf("Removed %s. Sending 'disconnected' to %s",userName,MakeClientId(roomName, userName))
      if err := channel.Send(c, MakeClientId(roomName, userName), "disconnected"); err != nil {
        c.Criticalf("OnDisconnect: Error while sending 'disconnected':",err)
      }
    }
  } else {
    c.Criticalf("OnDisconnect: Could not get room %s: ",roomName,err)
  }
}

func OnMessage(w http.ResponseWriter, r *http.Request) {
  c := appengine.NewContext(r)

  roomName, userName := ParseClientId(r.FormValue("from"))

  b, err := ioutil.ReadAll(r.Body);
  if err != nil {
    c.Criticalf("OnMessage: Error while reading body: %s",err)
    return
  }
  r.Body.Close()

  room, err := GetRoom(c, roomName)
  if err != nil {
    c.Criticalf("OnMessage: Error while retreiving room %s:",roomName,err)
    return
  }

  c.Debugf("received channel data message from %s in %s: %s",userName,roomName,b)

  otherUser := room.OtherUser(userName)
  if otherUser != "" {
    if err := channel.Send(c, MakeClientId(roomName, otherUser), string(b)); err != nil {
      c.Criticalf("OnMessage: Error while sending JSON:",err)
      return
    }
  }

  w.Write([]byte("OK"))
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

func MakeClientId(room string, user string) string {
  return user + "-" + room;
}

func ParseClientId(clientId string) (string, string) {
  from := strings.Split(clientId, "-")
  // room, user
  return from[1], from[0]
}

func AcceptLanguage(r *http.Request) string {
  acceptLanguage := "en-US"
  if _,ok := r.Header["Accept-Language"]; ok {
    acceptLanguage = strings.Join(r.Header["Accept-Language"], ",")
  }
  return acceptLanguage;
}

func Minified() string {
  // Minify when in production
  if !appengine.IsDevAppServer() {
    return "min."
  }


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
  printables := "abcdefghijklmnopqrstuvwxyx"
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
  http.HandleFunc("/manifest.appcache", AppCache)
  http.HandleFunc("/tech", Tech)
  http.HandleFunc("/_token", OnToken)
  http.HandleFunc("/_message", OnMessage)
  http.HandleFunc("/_connect", OnConnect)
  http.HandleFunc("/_disconnect", OnDisconnect)
  http.HandleFunc("/_expire", Expire)
  http.HandleFunc("/_occupants", Occupants)
  http.HandleFunc("/_ah/channel/connected/", OnConnect)
  http.HandleFunc("/_ah/channel/disconnected/", OnDisconnect)
}

func Auth(handler http.HandlerFunc) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request) {
    if CheckAuth(r) == false {
      RequireAuth(w, r)
    } else {
      handler(w, r)
    }
  }
}

func CheckAuth(r *http.Request) bool {
  s := strings.SplitN(r.Header.Get("Authorization"), " ", 2)
  if len(s) != 2 || s[0] != "Basic" {
    return false
  }
  b, err := base64.StdEncoding.DecodeString(s[1])
  if err != nil {
    return false
  }
  pair := strings.SplitN(string(b), ":", 2)
  if len(pair) != 2 {
    return false
  }
  if pair[1] == "bob" {
    return true
  }
  return false
}

func RequireAuth(w http.ResponseWriter, r *http.Request) {
  w.Header().Set("WWW-Authenticate", `Basic realm="Cube Slam"`)
  w.WriteHeader(401)
  w.Write([]byte("401 Unauthorized\n"))
}

func SkipRedirect(r *http.Request) bool {
  ua := r.Header.Get("User-Agent")
  if r.URL.Query().Get("redirect") == "no" {
    return true
  }
  if strings.Contains(ua,"facebookexternalhit") {
    return true
  }
  if strings.Contains(ua,"Googlebot") {
    return true
  }
  return false
}