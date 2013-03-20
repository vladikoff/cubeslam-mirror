var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [
   {id: 'block-rect', destroyable: true, size: [2,2], x: us*4, y: hh + us*7},
   {id: 'block-rect', destroyable: true, size: [2,2], x: hw, y: hh},
   {id: 'block-rect', destroyable: true, size: [2,2], x: aw - us*4, y: hh - us*7}
  ],
  forces: []
}