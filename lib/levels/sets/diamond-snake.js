var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [
    {id: 'diamond', x: hw, y: hh + (us * 5), size: 2},
    {id: 'diamond', x: hw, y: hh - (us * 5), size: 2},
    {id: 'triangle-left', x: hw + us - 45, y: hh + us*1.5, size:[1.5,1.5]},
    {id: 'triangle-right', x: hw - us + 45, y: hh - us*1.5 , size:[1.5,1.5]},

    {id: 'triangle-left', x: 40, y: hh+us*1.5, size:[1,2]},
    {id: 'triangle-right', x: aw-40, y: hh-us*1.5, size:[1,2]}
  ],

  positions: [
    {x: hw-us*3, y: us*10},
    {x: hw-us*3, y: us*22},
    {x: hw+us*3, y: us*4},
    {x: hw+us*3, y: us*16}
  ],

  forces: []

}