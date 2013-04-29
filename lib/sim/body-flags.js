var debug = require('debug')('sim:body-flags')

// check if flag is on with:
//    if( body.flags & Body.GHOST ) bla;
// turn on:
//    flags |= GHOST
// turn off:
//    flags &= ~GHOST
// toggle:
//    flags ^= GHOST
// combine flags when created with:
//    new Body(shape,x,y,Body.IMMOVABLE | Body.GHOST | Body.AWESOME)

// add more flags by increasing the right integer (1<<2, 1<<3 etc)
exports.DYNAMIC = 0 << 0;  // moves around
exports.STATIC  = 1 << 0;  // stays put
exports.DESTROY = 1 << 1;  // removed when hit
exports.BOUNCE  = 1 << 2;  // will bounce off of anything that is BOUNCE and STEER or REFLECT
exports.GHOST   = 1 << 3;  // passes through anything that is DYNAMIC
exports.REFLECT = 0 << 4;  // reflects based on shape normal
exports.STEER   = 1 << 4;  // reflects based on hit position
exports.DIRECT  = 1 << 5;  // reflects based on shape normal + velocity

// example definitions:
// DEFAULT = DYNAMIC
// BULLET = DYNAMIC | DESTROY
// PUCK = DYNAMIC | BOUNCE
// MULTI_PUCK = PUCK | DESTROY
// GHOST_PUCK = PUCK | GHOST
// PADDLE = DYNAMIC | BOUNCE | STEER
// BRICK = STATIC | BOUNCE | DESTROY | REFLECT
// OBSTACLE = STATIC | BOUNCE | REFLECT
// EXTRA = STATIC | DESTROY

exports.toString = function(f){
  if( typeof f != 'number' ){
    throw new Error('invalid flags, must be a number')
  }
  var s = []
  if( f & exports.STATIC ){
    s.push('STATIC');
  } else {
    s.push('DYNAMIC');
  }
  if( f & exports.DESTROY ){
    s.push('DESTROY');
  }
  if( f & exports.BOUNCE ){
    s.push('BOUNCE');
  }
  if( f & exports.GHOST ){
    s.push('GHOST');
  }
  if( f & exports.DIRECT ){
    s.push('DIRECT');
  } else if( f & exports.STEER ){
    s.push('STEER');
  } else {
    s.push('REFLECT');
  }
  return s.join(' | ')
}

exports.set = function(body,flags){
  debug('set flags',body.id,exports.toString(flags))
  body._flags = flags;
}

exports.has = function(body,flags){
  // way too noisy...
  // debug('has flags',Body.flags(flags))
  return body._flags & flags;
}

exports.add = function(body,flags){
  debug('add flags',body.id,exports.toString(flags))
  debug(' =',exports.toString(body._flags))
  body._flags |= flags;
  debug(' >',exports.toString(body._flags))
}

exports.del = function(body,flags){
  debug('del flags',body.id,exports.toString(flags))
  debug(' =',exports.toString(body._flags))
  body._flags &= ~flags;
  debug(' >',exports.toString(body._flags))
}
