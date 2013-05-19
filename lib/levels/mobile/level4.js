module.exports = {
  minSpawnTime:3,
  maxSpawnTime:6,
  maxExtras:4,
  ai: {
    maxSpeed: 8,
    reaction: 0.3,
    viewRange: 0.5,
    confusion:0.7
  },

  puck: {
    speed: 1.3,
    speedup: 0.1,
    maxspeed: 2
  },

  player: {
    shields: 3
  },

  set: 'triangles',

  extras: [
    {id: 'extralife',probability: 6},
    {id: 'laser',probability: 8},
    {id: 'paddleresize',probability: 12, round:3},
    {id: 'ghostball',probability: 6, round:2},
    {id: 'fog',probability: 1}
  ],

  positions: [
    {x: 200, y: 200},
    {x: 200, y: 2000},
    {x: 1400, y: 200},
    {x: 1400, y: 2000}
  ]
}