var settings = require('../settings')

module.exports = {
  ai: {
    maxSpeed: 14,
    reaction: 0.2,
    viewRange: 0.5
  },

  puck: {
    speed: 1.3,
    speedup: 0.1,
    maxspeed: 2
  },

  player: {
    shields: 3
  },

  set: 'triangles',

  extras: {
    available: [
      {id: 'extralife'},
      {id: 'multiball'},
      {id: 'ghostball'},
      {id: 'fog', round:2},
    ],
    positions: [
      {x: 200, y: 200},
      {x: 850, y: 1700},
      {x: 850, y: 700},
      {x: 200, y: 2000},
      {x: 1400, y: 200},
      {x: 1400, y: 2000}
    ]
  }
}
