var debug = require('debug')('actions:game')
  , see = require('../support/see');

exports.roundOver = function(world, hitPlayer){
  debug('%s round over',world.name)
  see('/game/next')
}
