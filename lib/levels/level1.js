
// example level json:
module.exports = {
  // name to pop up whenever it starts
  name: 'Level 1',

  // a description of the level
  description: 'Win by hitting your opponent 10 times.',

  // level styling (defaults to use the ones in settings)
  theme: {
    arenaColor: 0xb03425,
    puckColor: 0xefce06,
    shieldColor: 0xffffff,
  },

  // the starting speed of the puck(s)
  speed: 10,

  // the step to upgrade the speed on hit
  speedup: 0.1,

  // if this is set, the level ends when a player reached maxHits
  maxHits: 10,

  // actions to be called within
  // certain frames during a level
  actions: [
    {
      frame: 0, // can also use `time: x` (which seconds is converted to frames)
      action: 'obstacleCreate',
      params: ['hexagon',600,900]
    },

    {
      frame: '500...1000', // sometimes between 30 and 60 seconds
      action: 'obstacleDestroy',
      params: ['hexagon']
    },

    {
      frame: 1000,
      action: 'extraCreate',
      params: ['extraball',600,300]
    },

    // example of a level which ends after 90 seconds
    // (assuming maxHits hasn't already been met)
    {
      time: 90,
      action: 'gameOver'
    }
  ]
}



