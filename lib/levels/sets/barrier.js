var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [

   {id: 'block-rect', destroyable:true,  size: [2,1], x: hw, y: us*10 },
   {id: 'block-rect', destroyable:true,  size: [2,1], x: hw, y: us*11 },
   {id: 'block-rect', destroyable:false, size: [2,1], x: hw, y: us*12 },
   {id: 'block-rect', destroyable:true,  size: [2,1], x: hw, y: us*13 },
   {id: 'block-rect', destroyable:true,  size: [2,1], x: hw, y: us*14 },
   {id: 'block-rect', destroyable:false, size: [2,1], x: hw, y: us*15 },
   {id: 'block-rect', destroyable:true,  size: [2,1], x: hw, y: us*16 },
   {id: 'block-rect', destroyable:true,  size: [2,1], x: hw, y: us*17 },

  ],

  forces: [],

  positions: [
    {x: hw-us*3, y: us*10},
    {x: hw-us*3, y: us*13},
    {x: hw-us*3, y: us*16},
    {x: hw+us*3, y: us*10},
    {x: hw+us*3, y: us*13},
    {x: hw+us*3, y: us*16}
  ]
}