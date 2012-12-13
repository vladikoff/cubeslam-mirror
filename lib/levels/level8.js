// example level json:
// (it's not an actual JSON so that comments can be preserved)
module.exports =   {
    "name": "Level 8",
    "description": "",
    "speed": 10,
    "speedup": 0.1,
    "maxspeed": 40,
    "maxHits": 10,
    "theme": {
      "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 2896930,
        "terrainColor1": 5732410,
        "terrainColor2": 5271598,
        "terrainColor3": 5466917,
        "treeBranchColor": 5333290,
        iconColor:15715846
    },
    // the starting speed of the puck(s)
      speed: 30,

      // the step to upgrade the speed on hit
      speedup: 0.1,

      // the maximum speed a puck can reach
      maxspeed: 60,

      // if this is set, the level ends when a player reached maxHits
      maxHits: 3,

      speedAI: 30,

      // actions to be called within
      // certain frames during a level
      actions: [
       
      ]
  }



