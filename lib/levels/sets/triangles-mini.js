var settings = require('../../settings')
  , us = settings.data.unitSize
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2;

module.exports = {
  obstacles: [
    {id: 'triangle-left', x: 40, y: hh, size:[1,2]},
    {id: 'triangle-right', x: aw-40, y: hh, size:[1,2]}
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