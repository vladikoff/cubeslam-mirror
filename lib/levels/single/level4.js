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
    shields: 6
  },

  set: 'centerattract',

  extras: {
    available: [
      {id: 'extralife'},
      {id: 'multiball'},
      {id: 'ghostball'},
      {id: 'bulletproof', duration: 10},
      {id: 'timebomb', round:2},
      {id: 'fog', round:3}
    ],
    positions: [
      {x: 200, y: 200},
      {x: 850, y: 1700},
      {x: 850, y: 700},
      {x: 200, y: 2000},
      {x: 1400, y: 200},
      {x: 1400, y: 2000}
    ]
  }
}
