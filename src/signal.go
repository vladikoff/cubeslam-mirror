package rtc

import (
  "appengine"
  "appengine/channel"
  //"appengine/datastore"
)

type Signal struct {
  ClientId string
  Token string
}

func (s *Signal) Send(c appengine.Context, data string) error {
  var err error
  c.Debugf("Sending to client " + s.ClientId + "(" + s.Token + "): " + data)
  // if err = channel.Send(c, s.Token, data); err != nil {
  if err = channel.Send(c, s.ClientId, data); err != nil {
    c.Errorf("Error when sending Channel API message:", err)
  }
  return err
}

func (s *Signal) Init(c appengine.Context, clientId string) error {
  token, err := channel.Create(c, clientId)
  if err != nil {
    return err
  }
  s.ClientId = clientId
  s.Token = token
  c.Debugf("Created new token for " + clientId + ": " + token)
  return nil
}

func (s *Signal) Save(c appengine.Context) error {
  //k := datastore.NewKey(c, "Signal", s.ClientId, 0, nil)
  //_, err := datastore.Put(c, k, s)
  //return err;
  return nil
}

func GetSignal(c appengine.Context, clientId string) (*Signal, error) {
  //k := datastore.NewKey(c, "Signal", clientId, 0, nil)
  r := new(Signal)
  r.ClientId = clientId
  //err := datastore.Get(c, k, r)
  //return r, err;
  return r, nil
}
