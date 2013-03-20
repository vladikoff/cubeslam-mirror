var settings = require('../../settings')
  , aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2;

module.exports = {
  obstacles: [
    {id: 'hexagon', x: hw, y: hh}
  ],
  forces: []
}