var aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight
  , hw = aw/2
  , hh = ah/2;

module.exports = {
  // obstacles will be added during the game as soon as the ball
  // is not in the way. and it will stay until the end of the level.
  // here's the full list of available obstacles:
  obstacles: [
    {id: 'hexagon', x: hw, y: hh},
    {id: 'diamond', x: hw, y: hh},

    // destroyable (default: false) and size (default: 1x1) is optional
    {id: 'block-rect', destroyable: true, size: [1,1], x: 283, y: hh},

    {id: 'triangle-left', x: 100, y: hh},
    {id: 'triangle-right', x: hw-100, y: hh}
  ],

  // forces will be added similar as the obstacles
  // the type can be either 'repell' or 'attract'
  forces: [
    {type: 'repell', x: aw*.75, y: ah*.25, mass: 1000},
    {type: 'attract', x: aw*.25, y: ah*.75, mass: 800}
  ],

  // positions is places where the extras may be spawned.
  // this can be overridden by the level.
  positions: [
    {x: 200, y: 200},
    {x: 850, y: 1700},
    {x: 850, y: 700},
    {x: 200, y: 2000},
    {x: 1400, y: 200},
    {x: 1400, y: 2000}
  ]
}