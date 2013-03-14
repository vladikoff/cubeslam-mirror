var aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [],
  forces: [
    { type: 'attract', x: hw + us*.5, y: hh + us, mass: 900 }
  ]
}