var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2;

module.exports = {
  obstacles: [
    {id: 'triangle-left', x: 100, y: hh},
    {id: 'triangle-right', x: aw-100, y: hh}
  ],

  forces: [
    { type: 'attract', x: aw*.5, y: ah*.5, mass: 900 }
  ],

  positions: [
    {x: 200, y: 200},
    {x: 850, y: 1700},
    {x: 850, y: 700},
    {x: 200, y: 2000},
    {x: 1400, y: 200},
    {x: 1400, y: 2000}
  ]
}