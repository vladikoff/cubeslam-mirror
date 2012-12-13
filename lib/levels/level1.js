// example level json:
// (it's not an actual JSON so that comments can be preserved)
module.exports = {

  // name to pop up whenever it starts
  name: 'Level 1',

  // a description of the level
  description: 'Win by hitting your opponent 10 times.',

  // level styling (defaults to use the ones in settings)
  theme: {
     "shieldColor": 16777215,
        "puckColor": 15715846,
        "arenaColor": 0x892419,
        "terrainColor1": 5081052,
        "terrainColor2": 2065621,
        "terrainColor3": 1660021,
        "treeBranchColor": 1402020,
        iconColor:0x311fd2
  },

  // the starting speed of the puck(s)
  speed: 15,

  // the step to upgrade the speed on hit
  speedup: 0.1,

  // the maximum speed a puck can reach
  maxspeed: 40,

  // if this is set, the level ends when a player reached maxHits
  maxHits: 3,

  // actions to be called within
  // certain frames during a level
  actions: [
    /*{
      frame: 0, // can also use `time: x` (which seconds is converted to frames)
      action: 'obstacleCreate',
      params: ['hexagon',500,900]
    },*/

    {
      frame: '500...1000', // random between 30 and 60 seconds
      action: 'obstacleDestroy',
      params: ['hexagon']
    },

    {
      frame: 70,
      action: 'extraCreate',
      params: ['fog',600,1500]
    },

    {
      frame: 70,
      action: 'extraCreate',
      params: ['extralife',800,1600]
    },

    {
      frame: 1000,
      action: 'extraCreate',
      params: ['multiball',600,300]
    },


    // example of a level which ends after 90 seconds
    // (assuming maxHits hasn't already been met)
    {
      time: 90,
      action: 'gameOver'
    }
  ]
}



