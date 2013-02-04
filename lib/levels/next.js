module.exports = {
  name: 'Level 1',
  description: 'Just starting eh?',

  // speeds are multipliers of settings.data.unitSpeed
  cpu: {
    speed: 1,
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
    maxspeed: 4
  },

  player: {
    // the number of slots in the shield array of the
    // world.players.a/b. which will generate a shield
    // "physically" and visually.
    // must be divisable with settings.data.arenaColumns
    shields: 3
  },

  theme: {
    shieldColor: 0xffffff,
    puckColor: 0xefce06,
    arenaColor: 0x892419,
    terrainColor1: 0x4d87dc,
    terrainColor2: 0x1f84d5,
    terrainColor3: 0x195475,
    treeBranchColor: 0x1564a4,
    iconColor: 0xefce06
  },

  // extras will be added every 5-10 seconds and will be placed
  // at (pseudo-)randomly on the defined positions below. the
  // `available` list here is the available ones in this level.
  // the full list of available extras can be found in
  // lib/actions/extra.js
  extras: {
    available: [
      {id: 'fog', duration: 120},
      {id: 'extra life'}
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
    {id: 'block-rect', x: 283, y: 1104},
    {id: 'block-rect', x: 1417, y: 1104}
  ]
}
