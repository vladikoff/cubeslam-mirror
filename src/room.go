package webrtcing

import (
  "appengine"
  "appengine/datastore"
  "time"
)

type Room struct {
  Name string
  User1 string
  User2 string
  // AppEngine Channels API connected properly
  AEConnected1 bool
  AEConnected2 bool
  // JavaScript Channels API connected properly
  JSConnected1 bool
  JSConnected2 bool
  // Used to clean up old rooms
  LastChanged time.Time
}

func (r *Room) OtherUser(user string) string {
  if user == r.User2 {
    return r.User1
  }
  if user == r.User1 {
    return r.User2
  }
  return ""
}

func (r *Room) HasUser(user string) bool {
  if user == r.User2 {
    return true
  }
  if user == r.User1 {
    return true
  }
  return false
}

func (r *Room) AddUser(user string) {
  if r.User1 == "" && r.User2 != user {
    r.User1 = user
  } else if r.User2 == "" && r.User1 != user {
    r.User2 = user
  }
}

func (r *Room) RemoveUser(user string) bool {
  if user == r.User2 {
    r.User2 = ""
    r.AEConnected2 = false
    r.JSConnected2 = false
  }
  if user == r.User1 {
    r.User1 = ""
    r.AEConnected1 = false
    r.JSConnected1 = false
  }
  // returns true if it should be deleted
  return r.Occupants() == 0
}

func (r *Room) AEConnectUser(user string) {
  r.AddUser(user) // Adds the user if it was not added already
  if user == r.User1 {
    r.AEConnected1 = true
  }
  if user == r.User2 {
    r.AEConnected2 = true
  }
}

func (r *Room) JSConnectUser(user string) {
  r.AddUser(user) // Adds the user if it was not added already
  if user == r.User1 {
    r.JSConnected1 = true
  }
  if user == r.User2 {
    r.JSConnected2 = true
  }
}

func (r *Room) Connected(user string) bool {
  if user == r.User1 && r.AEConnected1 && r.JSConnected1 {
    return true
  }
  if user == r.User2 && r.AEConnected2 && r.JSConnected2 {
    return true
  }
  return false
}

func (r *Room) Occupants() int {
  occupancy := 0
  if r.User1 != "" { occupancy += 1 }
  if r.User2 != "" { occupancy += 1 }
  return occupancy
}

func GetRoom(c appengine.Context, name string) (*Room, error) {
  k := datastore.NewKey(c, "Room", name, 0, nil)
  r := new(Room)
  err := datastore.Get(c, k, r)
  return r, err;
}

func PutRoom(c appengine.Context, name string, room *Room) error {
  room.Name = name
  room.LastChanged = time.Now()
  k := datastore.NewKey(c, "Room", name, 0, nil)
  _, err := datastore.Put(c, k, room)
  c.Debugf("Storing %+v", room)
  return err;
}

func DelRoom(c appengine.Context, name string) error {
  k := datastore.NewKey(c, "Room", name, 0, nil)
  err := datastore.Delete(c, k)
  return err;
}

func DelRooms(c appengine.Context, rooms []Room) error {
  keys := make([]*datastore.Key,0)
  for _, room := range(rooms) {
    keys = append(keys, datastore.NewKey(c, "Room", room.Name, 0, nil))
  }
  c.Debugf("Deleting Rooms: %+v",keys)
  err := datastore.DeleteMulti(c, keys)
  return err;
}

func TotalOccupants(c appengine.Context) (int, error) {
  q := datastore.NewQuery("Room")
  t := 0
  for x := q.Run(c); ; {
    var r Room
    _, err := x.Next(&r)
    if err == datastore.Done {
      break;
    }
    if err != nil {
      return -1, err
    }
    t += r.Occupants()
  }
  return t, nil
}

func ExpiredRooms(c appengine.Context) ([]Room, error) {
  an_hour_ago := time.Now().Add(-time.Hour)
  rooms := make([]Room,0)
  q := datastore.NewQuery("Room").Filter("LastChanged <",an_hour_ago)
  for x := q.Run(c); ; {
    var room Room
    _, err := x.Next(&room)
    if err == datastore.Done {
      break;
    }
    if err != nil {
      return nil, err
    }
    c.Debugf("ExpiredRoom: %+v",room)
    rooms = append(rooms, room)
  }
  return rooms, nil
}
