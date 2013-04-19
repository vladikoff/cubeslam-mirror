
// eps as defined in states/game
var GAME_EPS = 1e-6;
function gameEPS(x){ return Math.round(x/GAME_EPS) * GAME_EPS }

// eps as defined in support/hash-code
var HASH_EPS = 1e-6;
function hashEPS(x){ return Math.round(Math.round(x/HASH_EPS) * HASH_EPS) }

var DOUBLE_EPS = 1e-12;
function doubleEPS(x){ return Math.round(Math.round(x/DOUBLE_EPS) * DOUBLE_EPS) }

var HALF_EPS = 1e-3;
function halfEPS(x){ return Math.round(Math.round(x/HALF_EPS) * HALF_EPS) }

var MIN_EPS = 1e-0;
function minEPS(x){ return Math.round(Math.round(x/MIN_EPS) * MIN_EPS) }

var NO_EPS = 1e-0;
function noEPS(x){ return Math.round(Math.round(x/NO_EPS) * NO_EPS) }

function floorEPS(x){ return Math.round(Math.floor(x/HASH_EPS) * HASH_EPS) }
function ceilEPS(x){ return Math.round(Math.ceil(x/HASH_EPS) * HASH_EPS) }

function testEPS(fn,a,b){
  try {
    console.assert(fn(a) === fn(b),'%s %s should equal %s',fn.name,fn(a),fn(b));
    console.log('  ok %s',fn.name)
  } catch(e){
    console.warn('  fail %s %s',e.message)
  }
}

function test(a,b){
  console.log('testing if %s ~== %s',a,b)
  testEPS(hashEPS,a,b)
  testEPS(gameEPS,a,b)
  testEPS(floorEPS,a,b)
  testEPS(ceilEPS,a,b)
  testEPS(doubleEPS,a,b)
  testEPS(halfEPS,a,b)
  testEPS(noEPS,a,b)
  testEPS(minEPS,a,b)
}

// test values from failed hashes
test(202.4999943566786,202.50000073437667)
test(202.9999943566786,203.00000073437667)
test(937.4917403425054,937.5014297671311)