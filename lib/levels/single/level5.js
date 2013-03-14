module.exports = {
  ai: {
    maxSpeed: 17,
    reaction: 0.3,
    viewRange: 0.4
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 3
  },

  player: {
    shields: 6
  },

  set: 'hexagon',

  extras: {
    available: [
      {id: 'extralife'},
      {id: 'fog', duration: 10},
      {id: 'bulletproof'},
      {id: 'fireball'}
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
