var settings = require('../settings')

module.exports = {
  name: 'Level 9',
  description: 'Just starting eh?',

  // speeds are multipliers of settings.data.unitSpeed
  ai: {
    maxSpeed: 20,
    reaction:0.3,
    viewRange:0.5
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
    speed: 1.8,
    speedup: .1,
    maxspeed: 3
  },

  player: {
    // the number of slots in the shield array of the
    // world.players.a/b. which will generate a shield
    // "physically" and visually.
    // must be divisable with settings.data.arenaColumns
    shields: 10
  },

  // extras will be added every 5-10 seconds and will be placed
  // at (pseudo-)randomly on the defined positions below. the
  // `available` list here is the available ones in this level.
  // the full list of available extras can be found in
  // lib/actions/extra.js
  extras: {
    available: [
      {id: 'extralife'},
      {id: 'fog', duration: 10},
      {id: 'multiball'},
      {id: 'fireball'},
      {id: 'ghostball'},
      {id: 'bulletproof', duration: 10}, // duration in seconds (buggy)
      {id: 'mirroredcontrols', duration: 10} // duration in seconds
      //{id: 'random'},
    ],
    // ~1700x2455
    positions: [
      {x: 200, y: 200},
      {x: 850, y: 1700},
      {x: 850, y: 700},
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
  
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*1.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*3.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*5.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*7.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*9.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*11.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*13.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*15.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*17.5, y: settings.data.arenaHeight*.5 },

   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*2.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*4.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*6.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*8.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*10.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*12.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*14.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*16.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},

   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*2.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*4.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*6.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*8.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*10.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*12.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*14.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*16.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   
  ]
}
