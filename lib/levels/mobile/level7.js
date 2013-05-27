module.exports = {
  ai: {
    maxSpeed: 15,
    reaction: 0.25,
    viewRange: 0.3,
    confusion:0.5
  },

  puck: {
    speed: 1.5,
    speedup: 0.1,
    maxspeed: 2
  },

  player: {
    shields: 6
  },

  set: ['octagon','empty','centerattract','triangles'],

  extras: [
    {id: 'extralife', probability: 5},
    {id: 'fog', duration: 10, probability: 2},
    {id: 'bulletproof', probability:5},
    {id: 'ghostball', probability: 4},
    {id: 'multiball', probability: 4},
    {id: 'laser', probability: 4},
    {id: 'fireball', probability: 4},
    {id: 'timebomb', probability: 4}

  ],
  positions: [
    {x: 200, y: 200},
    {x: 200, y: 2000},
    {x: 1400, y: 200},
    {x: 1400, y: 2000}
  ]
}