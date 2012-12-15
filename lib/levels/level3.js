// example level json:
// (it's not an actual JSON so that comments can be preserved)
module.exports =   {
    "name": "Level 3",
    "description": "",
    "speed": 10,
    "speedup": 0.1,
    "maxspeed": 40,
    "maxHits": 10,
    "theme": {
      "shieldColor": 16777215,
      "puckColor": 15715846,
      "arenaColor": 6714485,
      "terrainColor1": 14934989,
      "terrainColor2": 15131078,
      "terrainColor3": 14145467,
      "treeBranchColor": 14802639,
      iconColor:0x311fd2
    },
    // the starting speed of the puck(s)
      speed: 19,

      // the step to upgrade the speed on hit
      speedup: 0.1,

      // the maximum speed a puck can reach
      maxspeed: 45,

      // if this is set, the level ends when a player reached maxHits
      maxHits: 3,

      speedAI: 10,

      // actions to be called within
      // certain frames during a level
      "actions": [
      {
        "time": 0,
        "action": "obstacleCreate",
        "params": [
          "block-rect-1",
          283,
          1104
        ]
      },
      {
        "time": 0,
        "action": "obstacleCreate",
        "params": [
          "block-rect-2",
          1417,
          1104
        ]
      }
    
    ]
  }



