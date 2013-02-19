var settings = require('../settings')

module.exports = {
  name: 'Level 2',
  description: 'Just starting eh?',

  // speeds are multipliers of settings.data.unitSpeed
  cpu: {
    speed: 1.2,
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
    speed: 1.2,
    speedup: .2,
    maxspeed: 6
  },

  player: {
    // the number of slots in the shield array of the
    // world.players.a/b. which will generate a shield
    // "physically" and visually.
    // must be divisable with settings.data.arenaColumns
    shields: 6
  },
/*
  theme: {
    "shieldColor": 16777215,
    "puckColor": 15715846,
    "arenaColor": 3437519,
    "terrainColor1": 5674547,
    "terrainColor2": 4558365,
    "terrainColor3": 4822547,
    "treeBranchColor": 4296982,
    cpuBackdropColor: 0x0e0e0d,
    iconColor:15715846,
    gridBrightness:0.1
  },*/

  // extras will be added every 5-10 seconds and will be placed
  // at (pseudo-)randomly on the defined positions below. the
  // `available` list here is the available ones in this level.
  // the full list of available extras can be found in
  // lib/actions/extra.js
  extras: {
    available: [
      {id: 'fog', duration: 120},
      {id: 'extra life'},
      {id: 'multiball'}
    ],
    // ~1700x2455
    positions: [
      {x: 200, y: 200},
      {x: 200, y: 2000},
      {x: 1400, y: 200},
      {x: 1400, y: 2000}
    ]
  },

  // obstacles will be added during the game as soon as the ball
  // is not in the way. and it will stay until the end of the level.
  // the full list of available extras can be found in
  // lib/actions/obstacle.js
  obstacles: [
    {id: 'block-rect', x: 283, y: settings.data.arenaHeight*.5},
    {id: 'block-rect', x: 1417, y: settings.data.arenaHeight*.5}
  ]
}
