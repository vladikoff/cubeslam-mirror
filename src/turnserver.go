package webrtcing

import (
  "appengine"
  "appengine/datastore"
  "crypto/md5"
  "encoding/hex"
  "io"
  "net/http"
  "strconv"
  "strings"
)

type TurnServer struct {
  IP string
  SharedKey string
}

func (ts *TurnServer) SetIP(ip string) {
  ts.IP = ip
}

func (ts *TurnServer) SetSharedKey(sharedKey string) {
  ts.SharedKey = sharedKey
}

func GetTurnServer(c appengine.Context, geo string) (*TurnServer, error) {
  k := datastore.NewKey(c, "TurnServer", geo, 0, nil)
  r := new(TurnServer)
  err := datastore.Get(c, k, r)
  return r, err;
}

func PutTurnServer(c appengine.Context, geo string, turnServer *TurnServer) error {
  k := datastore.NewKey(c, "TurnServer", geo, 0, nil)
  _, err := datastore.Put(c, k, turnServer)
  return err;
}

type TurnClient struct {
  IP string
  Geo string
}

func (tc *TurnClient) SetProperties(c appengine.Context, r *http.Request) error {
  tc.IP = r.RemoteAddr
  idx := strings.LastIndex(tc.IP, ":")
  if idx != -1 {
    tc.IP = tc.IP[:idx] // Remove port from address, if there is one.
  }

  latlong := strings.Split(r.Header.Get("X-Appengine-Citylatlong"), ",")
  //lat, _ := strconv.ParseInt(latlong[0], 10, 32)
  if len(latlong) != 2 {
	 tc.Geo = "us"
  } else {
	long, _ := strconv.ParseInt(latlong[1], 10, 32)
	if long < -25 || long > 89 {
		// Anything west of Iceland or east of India is considered to be US. The rest is EU.
		tc.Geo = "us"
	} else {
		tc.Geo = "eu"
	}
  }
  return nil
}

func (tc *TurnClient) TurnConfig(c appengine.Context) string {
  username := Random(12)
  serverIP := "127.0.0.1"
  sharedKey := "00000000000000000000000000000000"

  if turnserver, err := GetTurnServer(c, tc.Geo); err == nil {
    serverIP = turnserver.IP
	  sharedKey = turnserver.SharedKey
  }

  hmac := md5.New()
  io.WriteString(hmac, username + ":" + tc.IP + ":" + sharedKey)

  return "{\"type\":\"turn\", \"url\":\"turn:" + username + "@" + serverIP + ":3478\", \"credential\":\"" + hex.EncodeToString(hmac.Sum(nil)) + "\"}"
}

func GetTurnClient(c appengine.Context, userName string, roomName string) (*TurnClient, error) {
  k := datastore.NewKey(c, "TurnClient", userName + "-" + roomName, 0, nil)
  r := new(TurnClient)
  err := datastore.Get(c, k, r)
  return r, err;
}

func PutTurnClient(c appengine.Context, userName string, roomName string, turnClient *TurnClient) error {
  k := datastore.NewKey(c, "TurnClient", userName + "-" + roomName, 0, nil)
  _, err := datastore.Put(c, k, turnClient)
  return err;
}

func DeleteTurnClient(c appengine.Context, userName string, roomName string) error {
  k := datastore.NewKey(c, "TurnClient", userName + "-" + roomName, 0, nil)
 err := datastore.Delete(c, k)
  return err;
}


