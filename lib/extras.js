var Body = require('./geom-sim/body')
  , shapes = require('./geom-sim/shapes')
  , settings = require('./settings');

var aw = settings.data.arenaWidth
  , ah = settings.data.arenaHeight;

exports.hexagon = new Body(shapes.hex(aw/5))
exports.hexagon.id = 'hexagon'

exports.fastball = new Body(shapes.rect(settings.data.unitSize,settings.data.unitSize))
exports.fastball.id = 'fastball'
exports.multiball = new Body(shapes.rect(settings.data.unitSize,settings.data.unitSize))
exports.multiball.id = 'multiball'
exports.fog = new Body(shapes.rect(settings.data.unitSize,settings.data.unitSize))
exports.fog.id = 'fog'
exports.extralife = new Body(shapes.rect(settings.data.unitSize,settings.data.unitSize))
exports.extralife.id = 'extralife'

// generate generic blocks
// to be used to a breakout
// styled level
for(var x=0; x < 10; x++){
  for(var y=0; y < 10; y++){
    var block = new Body(shapes.rect(settings.data.unitSize,settings.data.unitSize))
    block.setFlags(Body.STATIC | Body.BOUNCE | Body.DESTROY | Body.REFLECT);
    block.id = 'block-'+x+'-'+y;
    exports[block.id] = block;
  }
}

//for level 3
var block = new Body(shapes.rect(settings.data.unitSize*4,settings.data.unitSize*1))
block.id = "block-rect-1";
exports["block-rect-1"] = block;

block = new Body(shapes.rect(settings.data.unitSize*4,settings.data.unitSize*1))
block.id = "block-rect-2";
exports["block-rect-2"] = block;

//level 4
block = new Body(shapes.rect(settings.data.unitSize*6,settings.data.unitSize*6))
block.id = "big";
exports["big"] = block;
