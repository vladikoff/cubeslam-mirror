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
     "treeBranchColor": 14802639
    },
    // the starting speed of the puck(s)
      speed: 10,

      // the step to upgrade the speed on hit
      speedup: 0.1,

      // the maximum speed a puck can reach
      maxspeed: 40,

      // if this is set, the level ends when a player reached maxHits
      maxHits: 10,

      // actions to be called within
      // certain frames during a level
      actions: [
        { frame: 0, action: 'extraCreate', params: ['block-0-0',50,200] },


        // TODO would like to add that you have to get all the blocks before
        // game over to win.


        // example of a level which ends after 90 seconds
        // (assuming maxHits hasn't already been met)
        {
          time: 90,
          action: 'gameOver'
        }
      ]
  }



