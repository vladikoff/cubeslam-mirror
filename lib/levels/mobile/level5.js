module.exports = {
  maxExtras:4,
  ai: {
    maxSpeed: 10,
    reaction: 0.3,
    viewRange: 0.5,
    confusion:0.4
  },

  puck: {
    speed: 2,
    speedup: 0.13,
    maxspeed: 2.7
  },

  player: {
    shields: 6
  },

  set: 'empty',

  extras: [
    {id: 'extralife', probability: 4},
    {id: 'fog', duration: 3},
    {id: 'ghostball', probability: 2},
    {id: 'multiball', probability: 3},
    {id: 'laser', probability: 6},
    {id: 'fireball', probability: 5},
    {id: 'timebomb', probability: 5},
    {id: 'bulletproof', probability: 3}

  ],
  positions: [
    {x: 850, y: 2000},
    {x: 850, y: 200},

    {x: 1200, y: 1227},
    {x: 200, y: 1227}
  ]
}
