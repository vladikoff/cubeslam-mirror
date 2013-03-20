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
  forces: [],
  positions: [
    {x: 200, y: 200},
    {x: 850, y: 1700},
    {x: 850, y: 700},
    {x: 200, y: 2000},
    {x: 1400, y: 200},
    {x: 1400, y: 2000}
  ]
}