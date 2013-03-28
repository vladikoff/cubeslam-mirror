module.exports = {
  minSpawnTime:3,
  maxSpawnTime:6,
  maxExtras:3,

  ai: {
    maxSpeed: 15,
    reaction: 0.25,
    viewRange: 0.3,
    confusion:0.5
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 2
  },

  player: {
    shields: 6
  },

  set: 'hexagon',

  extras: [
    {id: 'fireball',probability: 5},
    {id: 'extralife',probability: 10},
    {id: 'fog', duration: 6,probability: 5},
    {id: 'bulletproof',probability: 5},
    
  ]
}