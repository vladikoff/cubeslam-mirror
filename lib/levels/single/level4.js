module.exports = {
  ai: {
    maxSpeed: 17,
    reaction: 0.3,
    viewRange: 0.5
  },

  puck: {
    speed: 1.4,
    speedup: .1,
    maxspeed: 3
  },

  player: {
    shields: 4
  },

  set: 'centerattract',

  extras: [
    {id: 'extralife'},
    {id: 'multiball'},
    {id: 'ghostball'},
    {id: 'bulletproof', duration: 10},
    {id: 'timebomb', round:2},
    {id: 'fog', round:3}
  ]
}
