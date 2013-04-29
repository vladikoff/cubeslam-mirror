var settings = require('../../settings')
  , us = settings.data.unitSize
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2
  , us = settings.data.unitSize;

module.exports = {
  obstacles: [
    {id: 'triangle-top', x: hw, y: hh-(us*2)-25, size:[1,1]},
    {id: 'triangle-bottom', x: hw, y: hh+(us*2)+25, size:[1,1]},

    {id: 'block-rect', destroyable:false, size: [4,4], x: hw, y: us*13 },

    {id: 'triangle-left', x: hw+(us*2)+30, y: hh, size:[1,1]},
    {id: 'triangle-right', x: hw-(us*2)-30, y: hh, size:[1,1]},

    {id: 'block-rect', destroyable:false, size: [1,1], x: us*0.5, y: ah*0.5 },
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*2.5, y: ah*0.5 },
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*4.5, y: ah*0.5 },
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*13.5, y: ah*0.5 },
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*15.5, y: ah*0.5 },
    {id: 'block-rect', destroyable:false, size: [1,1], x: us*17.5, y: ah*0.5 },

    {id: 'block-rect', destroyable:true, size: [1,1], x: us*1.5, y: ah*0.5 + us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*3.5, y: ah*0.5 + us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*5.5, y: ah*0.5 + us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*12.5, y: ah*0.5 + us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*14.5, y: ah*0.5 + us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*16.5, y: ah*0.5 + us*3},

    {id: 'block-rect', destroyable:true, size: [1,1], x: us*1.5, y: ah*0.5 - us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*3.5, y: ah*0.5 - us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*5.5, y: ah*0.5 - us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*12.5, y: ah*0.5 - us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*14.5, y: ah*0.5 - us*3},
    {id: 'block-rect', destroyable:true, size: [1,1], x: us*16.5, y: ah*0.5 - us*3}
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