var Body = require('./geom-sim/body')
  , shapes = require('./geom-sim/shapes')
  , settings = require('./settings');

var aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight;

exports.hexagon = new Body(shapes.hex(aw/5))
exports.hexagon.id = 'hexagon'
exports.fastball = new Body(shapes.rect(aw/10,aw/10))
exports.fastball.id = 'fastball'
exports.multiball = new Body(shapes.rect(aw/20,aw/20))
exports.multiball.id = 'multiball'
exports.fog = new Body(shapes.rect(aw/20,aw/20))
exports.fog.id = 'fog'

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