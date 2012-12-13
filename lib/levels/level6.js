// example level json:
// (it's not an actual JSON so that comments can be preserved)
module.exports =   {
    "name": "Level 6",
    "description": "",
    "speed": 10,
    "speedup": 0.1,
    "maxspeed": 40,
    "maxHits": 10,
    "theme": {
        "shieldColor": 15259350,
        "puckColor": 15790303,
        "arenaColor": 12477202,
        "terrainColor1": 1218007,
        "terrainColor2": 2327523,
        "terrainColor3": 5723991,
        "treeBranchColor": 3642849,
        iconColor:15790303
    },
    // the starting speed of the puck(s)
      speed: 26,

      // the step to upgrade the speed on hit
      speedup: 0.1,

      // the maximum speed a puck can reach
      maxspeed: 60,

      // if this is set, the level ends when a player reached maxHits
      maxHits: 3,

      // actions to be called within
      // certain frames during a level
      actions: [
       
      ]
  }



