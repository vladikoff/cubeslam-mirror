module.exports = {
  ai: {
    maxSpeed: 17,
    reaction: 0.3,
    viewRange: 0.5,
    confusion:0.5
  },

  puck: {
    speed: 1.4,
    speedup: .2,
    maxspeed: 2
  },

  player: {
    shields: 3
  },

  set: 'centerattract',

  extras: [
    {id: 'extralife', probability: 4},
    {id: 'ghostball',round:4, probability: 3},
    {id: 'mirroredcontrols', duration: 10, probability: 1},
    {id: 'paddleresize', probability: 4},
    {id: 'multiball', duration: 10, probability: 4}
    
  ]
}
