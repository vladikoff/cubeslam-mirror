var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [],

  forces: [
    { type: 'attract', x: aw*.75, y: ah*.25, mass: 600 },
    { type: 'attract', x: aw*.50 + us*.5, y: ah*.5, mass: 800 },
    { type: 'attract', x: aw*.25, y: ah*.75, mass: 600 }
  ]
}