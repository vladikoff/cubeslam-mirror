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

// generate generic blocks
// to be used to a breakout
// styled level
for(var x=0; x < 10; x++){
  for(var y=0; y < 10; y++){
    var block = new Body(shapes.rect(aw/20,aw/20))
    block.id = 'block-'+x+'-'+y;
    exports[block.id] = block;
  }
}