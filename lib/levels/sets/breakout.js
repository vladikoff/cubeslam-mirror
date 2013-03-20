var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2;

module.exports = {
  obstacles: [

   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*1.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*3.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*5.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*7.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*9.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*11.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*13.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*15.5, y: settings.data.arenaHeight*.5 },
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*17.5, y: settings.data.arenaHeight*.5 },

   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*2.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*4.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*6.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*8.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*10.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*12.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*14.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*16.5, y: settings.data.arenaHeight*.5 + settings.data.unitSize*3},

   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*2.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*4.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*6.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*8.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*10.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*12.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*14.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},
   {id: 'block-rect', destroyable:true, size: [1,1], x: settings.data.unitSize*16.5, y: settings.data.arenaHeight*.5 - settings.data.unitSize*3},

  ],

  forces: []
}
