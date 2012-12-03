var Body = require('./geom-sim/body')
  , shapes = require('./geom-sim/shapes')
  , settings = require('./settings');

var aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight;

exports.hexagon = new Body(shapes.hex(aw/5))
exports.hexagon.id = 'hexagon'
exports.speedball = new Body(shapes.rect(aw/10,aw/10))
exports.speedball.id = 'speedball'
exports.extraball = new Body(shapes.rect(aw/20,aw/20))
exports.extraball.id = 'extraball'