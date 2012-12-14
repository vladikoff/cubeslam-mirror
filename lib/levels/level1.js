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

   
    {
      "frame": 10,
      "action": "extraCreate",
      "params": [
        "multiball",
        867,
        1140
      ],
      "time": 10,
      "called": true
    },
    {
      "frame": 70,
      "action": "extraCreate",
      "params": [
        "fog",
        293,
        1701
      ],
      "time": 4
    },
    {
      "frame": 70,
      "action": "extraCreate",
      "params": [
        "extralife",
        405,
        1683
      ],
      "time": 8.8
    },
    {
      "time": 90,
      "action": "gameOver",
      "frame": 5400,
      "params": []
    },
    {
      "time": 20,
      "action": "extraCreate",
      "params": [
        "extralife",
        1496,
        524
      ]
    }
  ]
}



