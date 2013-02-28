var settings = require('../settings')

module.exports = {
  name: 'Level 1',
  description: 'Just starting eh?',

  // speeds are multipliers of settings.data.unitSpeed
  ai: {
    maxSpeed: 10,
    reaction:0.1,
    viewRange:0.6
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
    shields: 3
  },

  // extras will be added every 5-10 seconds and will be placed
  // at (pseudo-)randomly on the defined positions below. the
  // `available` list here is the available ones in this level.
  // the full list of available extras can be found in
  // lib/actions/extra.js
  extras: {
    available: [
      // {id: 'bulletproof', duration: 5}, // duration in seconds (buggy)
      //{id: 'mirrored controls', duration: 10}, // duration in seconds
      //{id: 'random'},
      //{id: 'fog', duration: 10},
      {id: 'extra life'},
      //{id: 'ghost ball'},
      //{id: 'fireball'},
      // {id: 'multiball'},
      {id: 'paddle resize',duration:3} // duration defaults to 10s
      //{id: 'death ball',duration:3}
    ],
    // ~1700x2455
    positions: [
      {x: 200, y: 200},
      {x: 850, y: 1700},
      {x: 850, y: 700},
      {x: 200, y: 2000},
      {x: 1400, y: 200},
      // {x: 1400, y: 2000}
    ]
  },

  // obstacles will be added during the game as soon as the ball
  // is not in the way. and it will stay until the end of the level.
  // the full list of available obstacles can be found in
  // lib/actions/obstacle.js
  obstacles: [
   //{id: 'diamond', x: settings.data.arenaWidth*.5, y: settings.data.arenaHeight*.5}
  ],

  // forces will be added similar as the obstacles
  // the type can be either 'repell' or 'attract'
  forces: [
    //{ type: 'repell', x: settings.data.arenaWidth*.75, y: settings.data.arenaHeight*.25, mass: 500 },
    //{ type: 'attract', x: settings.data.arenaWidth*.25, y: settings.data.arenaHeight*.75, mass: 700 }
  ]
}
