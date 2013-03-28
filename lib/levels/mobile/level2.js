module.exports = {
  maxExtras:3,
  ai: {
    maxSpeed: 10,
    reaction: 0.2,
    viewRange: 0.6,
    confusion:0.8
  },

  puck: {
    speed: 1.3,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 2
  },

  set: 'empty',

  extras: [
    {id: 'extralife', probability: 30},
    {id: 'multiball', probability: 20},
    {id: 'paddleresize',probability: 4},
    {id: 'fog', round: 2, probability: 40},
    {id: 'ghostball', round: 4, probability: 60}
  ],

  positions: [
    {x: 200, y: 200},
    {x: 200, y: 2000},
    {x: 1400, y: 200},
    {x: 1400, y: 2000}
  ]
}
