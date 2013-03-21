module.exports = {
  ai: {
    maxSpeed: 17,
    reaction: 0.3,
    viewRange: 0.4
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 5
  },

  set: 'hexagon',

  extras: [
    {id: 'extralife'},
    {id: 'fog', duration: 10},
    {id: 'bulletproof'},
    {id: 'fireball'}
  ]
}