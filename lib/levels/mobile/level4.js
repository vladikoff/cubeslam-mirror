module.exports = {
  ai: {
    maxSpeed: 17,
    reaction: 0.3,
    viewRange: 0.5,
    confusion:0.2
  },

  puck: {
    speed: 1.4,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 3
  },

  set: 'centerattract',

  extras: [
    {id: 'extralife'},
    {id: 'ghostball',round:4},
    {id: 'bulletproof', duration: 10}
    
  ]
}
