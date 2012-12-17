// example level json:
// (it's not an actual JSON so that comments can be preserved)
module.exports = {

  // name to pop up whenever it starts
  name: 'Level 1',

  // a description of the level
  description: 'Win by hitting your opponent 10 times.',

  // level styling (defaults to use the ones in settings)
  theme: {
    shieldColor: 16777215,
    puckColor: 15715846,
    arenaColor: 0x892419,
    terrainColor1: 5081052,
    terrainColor2: 2065621,
    terrainColor3: 1660021,
    treeBranchColor: 1402020,
    iconColor: 15715846
  },

  // the starting speed of the puck(s)
  speed: 15,

  // the step to upgrade the speed on hit
  speedup: 0.1,

  // the maximum speed a puck can reach
  maxspeed: 40,

  // if this is set, the level ends when a player reached maxHits
  maxHits: 3,

  speedAI: 5,

  // actions to be called within
  // certain frames during a level
  actions: [
    /*{
      frame: 0, // can also use `time: x` (which seconds is converted to frames)
      action: 'obstacleCreate',
      params: ['hexagon',500,900]
    },*/

      //fog
      { "time": 10,"action": "extraCreate","params": ["fog",331,1606]},
      { "time": 30,"action": "extraCreate","params": ["fog",1511,1606]},

      //multiball
      { "time": 20,"action": "extraCreate","params": ["multiball",341,1983]},
      { "time": 20,"action": "extraCreate","params": ["multiball",341,1983]},

      //extra life
      { "time": 20,"action": "extraCreate","params": ["extralife",897,615]},
      { "time": 30,"action": "extraCreate","params": ["extralife",1275,1653]},
      { "time": 40,"action": "extraCreate","params": ["extralife",425,519]},

      {
        "time": 90,
        "action": "gameOver",
        "frame": 5400,
        "params": []
      }
    ]
}



