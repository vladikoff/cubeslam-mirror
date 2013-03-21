module.exports = {

  ai: {
    maxSpeed: 5.6,
    reaction:0.6,
    viewRange:0.6,
    confusion:0.8
    // what else can we control with the AI?
    // - reaction time? (z distance from the ball until movement)
    // - max speed?
    // - shakiness? (random jumps back and forth)
  },

  // speeds are multipliers of settings.data.unitSpeed
  // these are the starting speeds of the puck. then each
  // puck will have different speeds depending on the times
  // they've bounced against a paddle
  puck: {
    // unit * (speed+speedup*bounces)
    // 20 * (1+0) > 20 * (1+.2) > 20 * (1+.4)
    // ex. 20 > 20 * 1.2 > 20 * 1.4 > ... > 20 * 4
    speed: 1,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    // the number of slots in the shield array of the
    // world.players.a/b. which will generate a shield
    // "physically" and visually.
    // must be divisable with settings.data.arenaColumns
    shields: 2
  },

  // see sets/index.js for available extras
  set: 'empty',

  // spawn time in seconds
  minSpawnTime: 1, // optional defaults to 5
  maxSpawnTime: 3, // optional defaults to 10

  // all available extras
  extras: [
    {id: 'extralife', round:2, probability: 20},
    {id: 'multiball', round:3, probability: 10},
    {id: 'ghostball', round:4, probability: 5},
    {id: 'bulletproof', duration: 5}, // duration in seconds (buggy)
    {id: 'mirroredcontrols', duration: 5}, // duration in seconds
    {id: 'random'},
    {id: 'fog', duration: 10},
    {id: 'fireball'},
    {id: 'timebomb', time: 5, radius: 0}, // time in seconds (radius defaults to half the arena)
    {id: 'laser'},
    {id: 'paddleresize',duration:3} // duration defaults to 10s
    {id: 'deathball',duration:5}
  ],

  // spawn positions for extras. mainly defined
  // by sets. but may be overridden here by the
  // level if necessary.
  positions: [
    {x: 200, y: 200},
    {x: 850, y: 1700},
    {x: 850, y: 700},
    {x: 200, y: 2000},
    {x: 1400, y: 200},
    {x: 1400, y: 2000}
  ]
}
