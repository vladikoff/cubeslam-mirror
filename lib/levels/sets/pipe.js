var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [

   {id: 'block-rect', destroyable:false, size: [2,8], x: hw-us*3, y: us*16 },
   {id: 'block-rect', destroyable:false, size: [2,8], x: hw+us*3, y: us*10 },

  ],

  forces: [],

  positions: [
    {x: hw-us*3, y: us*10},
    {x: hw-us*3, y: us*22},
    {x: hw+us*3, y: us*4},
    {x: hw+us*3, y: us*16},
  ]
}