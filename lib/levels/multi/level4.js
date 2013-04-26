module.exports = {
  ai: {
    maxSpeed: 10,
    reaction: 0.3,
    viewRange: 0.5,
    confusion: 0.5
  },

  puck: {
    speed: 1.5,
    speedup: .1,
    maxspeed: 2.5
  },

  player: {
    shields: 4
  },

  set: 'arrows',

  extras: [
    {id: 'extralife'},
    {id: 'laser'},
    {id: 'ghostball', round:4},
    {id: 'bulletproof', duration: 10},
    {id: 'timebomb', round:2}
  ]
}
