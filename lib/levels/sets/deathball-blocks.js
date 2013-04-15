var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [

  //left
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*3 - us*.5, y: hh + us*3},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*3 - us*.5, y: hh + us*2},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*3 - us*.5, y: hh + us*1},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*3 - us*.5, y: hh},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*3 - us*.5, y: hh - us*1},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*3 - us*.5, y: hh - us*2},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*3 - us*.5, y: hh - us*3},

  //right
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*3 + us*.5, y: hh + us*3},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*3 + us*.5, y: hh + us*2},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*3 + us*.5, y: hh + us*1},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*3 + us*.5, y: hh},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*3 + us*.5, y: hh - us*1},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*3 + us*.5, y: hh - us*2},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*3 + us*.5, y: hh - us*3},

   //far
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*2 - us*.5, y: hh - us*3},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*1 - us*.5, y: hh - us*3},

   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*1+us*.5, y: hh - us*3},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*2+us*.5, y: hh - us*3},

   //close
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*2 - us*.5, y: hh + us*3},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw-us*1 - us*.5, y: hh + us*3},

   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*1+us*.5, y: hh + us*3},
   {id: 'block-rect', destroyable: true, size: [1,1], x: hw+us*2+us*.5, y: hh + us*3},

  ],
  forces: [],
  positions: [
    {x: 200, y: 200},
    {x: 850, y: 1700},
    // {x: 850, y: 700},
    {x: 200, y: 2000},
    {x: 1400, y: 200},
    {x: 1400, y: 2000}
  ]
}