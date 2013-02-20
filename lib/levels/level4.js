// example level json:
// (it's not an actual JSON so that comments can be preserved)
var settings = require('../settings');

module.exports =   {
    "name": "Level 4",
    "description": "",
    "speed": 10,
    "speedup": 0.1,
    "maxspeed": 40,
    "maxHits": 10,
    "theme": {
     "shieldColor": 16777215,
      "puckColor": 15715846,
      "arenaColor": 4693302,
      "terrainColor1": 3369162,
      "terrainColor2": 1399980,
      "terrainColor3": 2249624,
      "treeBranchColor": 1338555,
      iconColor:15715846
    },
    // the starting speed of the puck(s)
      speed: 25,

      // the step to upgrade the speed on hit
      speedup: 0.1,

      // the maximum speed a puck can reach
      maxspeed: 50,

      // if this is set, the level ends when a player reached maxHits
      maxHits: 3,

      speedAI: 14,

      // actions to be called within
      // certain frames during a level
      actions: [
        {
          "time": 0,
          "action": "obstacleCreate",
          "params": [
            "big",
            settings.data.arenaWidth*.5,
            settings.data.arenaHeight*.5
          ]
        },
      ]
  }



