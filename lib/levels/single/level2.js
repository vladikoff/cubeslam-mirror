module.exports = {
  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.6
  },

  puck: {
    speed: 1.3,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 3
  },

  set: 'empty',

  extras: {
    available: [
      {id: 'extralife'},
      {id: 'multiball', round: 2},
      {id: 'fog', round: 3},
      {id: 'ghostball', round: 4}
    ],
    positions: [
      {x: 200, y: 200},
      {x: 200, y: 2000},
      {x: 1400, y: 200},
      {x: 1400, y: 2000}
    ]
  }
}
