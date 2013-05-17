var settings = require('../../settings')
  , us = settings.data.unitSize
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [
    {id: 'block-rect', destroyable:true, size: [1,4], x: us*0.5, y: hh+us*2.2 },
    {id: 'block-rect', destroyable:true, size: [1,4], x: us*1.5, y: hh+us*2.2 },

    {id: 'block-rect', destroyable:true, size: [1,4], x: aw-us*0.5, y: hh-us*2.2 },
    {id: 'block-rect', destroyable:true, size: [1,4], x: aw-us*1.5, y: hh-us*2.2 },

    {id: 'triangle-left', x: us*3-30, y: hh+us*2.2, size:[2,2]},
    {id: 'triangle-right', x: aw-us*3+30, y: hh-us*2.2, size:[2,2]}

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