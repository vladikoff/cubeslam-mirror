var settings = require('../../settings');

var aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2;

module.exports = {
  maxExtras:4,
  ai: {
    maxSpeed: 18,
    reaction: 0.3,
    viewRange: 0.5,
    confusion:0.5
  },

  puck: {
    speed: 1.6,
    speedup: .1,
    maxspeed: 2.3
  },

  player: {
    shields:10
  },

  set: 'deathballblocks',

  extras: [
    {id: 'deathball', probability: 15, duration:6, position: {x: hw, y: hh}},
    {id: 'extralife',probability: 2},
    {id: 'timebomb',probability: 2},
    // {id: 'fireball',round:2,probability: 2},
    {id: 'ghostball',round:2,probability: 2},
    {id: 'bulletproof', duration: 10,round:2,probability: 2}, // duration in seconds (buggy)

  ],

  /*positions: [
    {x: hw, y: hh}
  ]*/
}