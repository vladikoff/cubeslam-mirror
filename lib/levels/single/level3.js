module.exports = {
  ai: {
    maxSpeed: 14,
    reaction: 0.2,
    viewRange: 0.5
  },

  puck: {
    speed: 1.3,
    speedup: 0.1,
    maxspeed: 2,
    confusion:0.5
  },

  player: {
    shields: 3
  },

  set: 'triangles',

  extras: [
    {id: 'extralife'},
    {id: 'ghostball',round:2},
    {id: 'fog'},
  ]
}
