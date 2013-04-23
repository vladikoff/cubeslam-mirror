
module.exports = {
  maxExtras: 4,
  ai: {
    maxSpeed: 10,
    reaction: 0.3,
    viewRange: 0.5,
    confusion:0.5
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 2.5
  },

  player: {
    shields: 3
  },

  set: 'centerattract',

  extras: [
    {id: 'extralife', probability: 20},
    {id: 'laser', probability: 15},
    {id: 'bulletproof', duration: 10, probability: 10},
    {id: 'ghostball',round:4, probability: 10},
    {id: 'timebomb', round:2, probability: 10}
  ]
}
