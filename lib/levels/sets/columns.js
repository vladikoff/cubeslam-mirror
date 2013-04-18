var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [

    {id: 'block-rect', destroyable:false, size: [1,3], x: hw, y: hh},
    {id: 'block-rect', destroyable:false, size: [1,3], x: hw-us*3, y: hh},
    {id: 'block-rect', destroyable:false, size: [1,3], x: hw-us*6, y: hh},
    {id: 'block-rect', destroyable:false, size: [1,3], x: hw+us*3, y: hh},
    {id: 'block-rect', destroyable:false, size: [1,3], x: hw+us*6, y: hh}

  ],

  forces: [],
  positions: [
    {x: hw-us*1.5, y: hh},
    {x: hw-us*4.5, y: hh},
    {x: hw-us*7.5, y: hh},
    {x: hw+us*1.5, y: hh},
    {x: hw+us*4.5, y: hh},
    {x: hw+us*7.5, y: hh}
  ]
}