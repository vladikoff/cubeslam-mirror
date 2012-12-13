// example level json:
// (it's not an actual JSON so that comments can be preserved)
module.exports =   {
    "name": "Level 5",
    "description": "",
    "speed": 10,
    "speedup": 0.1,
    "maxspeed": 40,
    "maxHits": 10,
    "theme": {
     "shieldColor": 16777215,
      "puckColor": 15715846,
      "arenaColor": 1250068,
      "terrainColor1": 3618615,
      "terrainColor2": 2829357,
      "terrainColor3": 2368808,
      "treeBranchColor": 3422268,
      iconColor:15715846
    },
    // the starting speed of the puck(s)
      speed: 24,

      // the step to upgrade the speed on hit
      speedup: 0.1,

      // the maximum speed a puck can reach
      maxspeed: 55,

      // if this is set, the level ends when a player reached maxHits
      maxHits: 3,

      // actions to be called within
      // certain frames during a level
      actions: [
       
      ]
  }



