var aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2;

module.exports = {
  obstacles: [
    {id: 'triangle-left', x: 100, y: hh},
    {id: 'triangle-right', x: hw-100, y: hh}
  ],

  forces: []
}