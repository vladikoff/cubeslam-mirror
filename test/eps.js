
// eps as defined in states/game

var GAME_EPS = 1e-6;
function gameEPS(x){ return Math.round(x/GAME_EPS) * GAME_EPS }

// eps as defined in support/hash-code
var HASH_EPS = 1e-6;
function hashEPS(x){ return Math.round(Math.round(x/HASH_EPS) * HASH_EPS) }


function testEPS(fn,a,b){
  try {
    console.assert(fn(a) === fn(b),'%s %s should equal %s',fn.name,fn(a),fn(b));
  } catch(e){
    console.warn(e.message)
  }
}

function test(a,b){
  testEPS(hashEPS,a,b)
  testEPS(gameEPS,a,b)
}

// test values from failed hashes
test(202.4999943566786,202.50000073437667)