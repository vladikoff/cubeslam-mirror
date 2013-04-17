var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2;

module.exports = {
  obstacles: [
    {id: 'octagon', x: hw, y: hh}
  ],
  forces: [],
  positions: [
    {x: 200, y: 200},
    {x: 850, y: 1700},
    {x: 200, y: 2000},
    {x: 1400, y: 200},
    {x: 1400, y: 2000}
  ]
}