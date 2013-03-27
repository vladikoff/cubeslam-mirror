module.exports = {
  minSpawnTime:3,
  maxSpawnTime:5,
  ai: {
    maxSpeed: 19,
    reaction:0.3,
    viewRange:0.3,
    confusion:0.5
  },

  puck: {
    speed: 1.7,
    speedup: .1,
    maxspeed: 2.5
  },

  player: {
    shields: 7
  },

  set: 'diagonalblocks',

  extras: [
    {id: 'extralife',probability: 10},
    {id: 'laser',probability: 20},
    {id: 'paddleresize',probability: 20},
    {id: 'fog', duration: 5,probability: 5},
    {id: 'fireball',probability: 10},
    {id: 'ghostball',probability: 5},
    {id: 'bulletproof', duration: 10,probability: 10}
  ]
}
