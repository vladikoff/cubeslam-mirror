// example level json:
// (it's not an actual JSON so that comments can be preserved)
module.exports = {

  // name to pop up whenever it starts
  name: 'Level 2',

  // a description of the level
  description: 'Breakout style!',

  // level styling (defaults to use the ones in settings)
  theme: {
    "shieldColor": 16777215,
    "puckColor": 15715846,
    "arenaColor": 3437519,
    "terrainColor1": 5674547,
    "terrainColor2": 4558365,
    "terrainColor3": 4822547,
    "treeBranchColor": 4296982,
    iconColor:15715846
  },

  // the starting speed of the puck(s)
  speed: 17,

  // the step to upgrade the speed on hit
  speedup: 0.1,

  // the maximum speed a puck can reach
  maxspeed: 40,

  // if this is set, the level ends when a player reached maxHits
  maxHits: 3,

  speedAI: 7,

  // actions to be called within
  // certain frames during a level
  actions: [

    {
      time: 5,
      action: 'obstacleCreate',
      params: ['hexagon',803,1104]
    },

    {
      //frame: '500...1000', // random between 30 and 60 seconds
      time: 15,
      action: 'obstacleDestroy',
      params: ['hexagon']
    },

    /*{ frame: 0, action: 'extraCreate', params: ['block-0-0',50,200] },*/

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



