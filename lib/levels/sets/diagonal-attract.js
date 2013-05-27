var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [],

  forces: [
    { type: 'attract', x: aw*.75, y: ah*.25, mass: 600, power: .5 },
    { type: 'attract', x: aw*.50 + us*.5, y: ah*.5, mass: 800, power: .4 },
    { type: 'attract', x: aw*.25, y: ah*.75, mass: 600, power: .5 }
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