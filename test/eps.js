
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

function genRoundRoundEPS(n){
  n = Math.pow(10,-n);
  return function(x){
    return Math.round(Math.round(x/n)*n);
  }
}

function genFloorRoundEPS(n){
  n = Math.pow(10,-n);
  return function(x){
    return Math.floor(Math.round(x/n)*n);
  }
}

function genCeilRoundEPS(n){
  n = Math.pow(10,-n);
  return function(x){
    return Math.ceil(Math.round(x/n)*n);
  }
}

function genDoubleRoundRoundEPS(p){
  var n = Math.pow(10,-p);
  return function(x){
    x = Math.round(Math.round(x/n)*n);
    var m = Math.pow(10,-(p+1));
    return Math.round(Math.round(x/m)*m);
  }
}

function genPowerOfTwoEPS(n){
  n = Math.pow(2,-n);
  return function(x){
    return Math.round(x*n);
  }
}

// http://stackoverflow.com/a/11383642/80582
function q(x){
  var quantum = 1024;
  var invQuantum = 1/quantum;
  return Math.round(x*quantum)*invQuantum;
}

var EPS_1 = 1e-1;
var EPS_2 = 1e-2;
function heps(x){
  x = Math.round(Math.round(x/EPS_1)*EPS_1);
  return Math.round(Math.round(x/EPS_2)*EPS_2);
}

function testEPS(fn,a,b,name){
  try {
    var x = fn(a)
    var y = fn(b)
    console.assert(x === y,'%s should equal %s',x,y);
    console.log('  ok %s',name||fn.name,x,y)
  } catch(e){
    console.warn('  fail %s: %s',name||fn.name,e.message)
  }
}

function test(a,b){
  console.log('testing if %s ~== %s',a,b)
  // testEPS(hashEPS,a,b)
  // testEPS(gameEPS,a,b)
  // testEPS(floorEPS,a,b)
  // testEPS(ceilEPS,a,b)
  // testEPS(doubleEPS,a,b)
  // testEPS(halfEPS,a,b)
  // testEPS(noEPS,a,b)
  // testEPS(minEPS,a,b)
  testEPS(heps,a,b)
  testEPS(genDoubleRoundRoundEPS(1),b,a)
  testEPS(genDoubleRoundRoundEPS(1),a,b)
  testEPS(genPowerOfTwoEPS(10),b,a)
  testEPS(genPowerOfTwoEPS(10),a,b)
  testEPS(q,a,b)
  testEPS(q,b,a)
  // for(var i=0; i<15; i++)
  //   testEPS(genDoubleRoundRoundEPS(i),a,b,'doubleRoundRound'+i)
  // for(var i=0; i<15; i++)
  //   testEPS(genRoundRoundEPS(i),a,b,'roundRound'+i)
  // for(var i=0; i<15; i++)
  //   testEPS(genFloorRoundEPS(i),a,b,'floorRound'+i)
  // for(var i=0; i<15; i++)
  //   testEPS(genCeilRoundEPS(i),a,b,'ceilRound'+i)
}

// test values from failed hashes
test(202.4999943566786,202.50000073437667)
test(202.9999943566786,203.00000073437667)
test(937.4917403425054,937.5014297671311)
test(385.00000000000546,384.9999960263542)
test(620.0000000000048,619.9999960263544)
test(1366.4871288054987,1366.5033779667137)
test(204.90271284730437,204.90269036052945)
test(1366.4871288054987,1366.5033779667137)
test(1341.4474991937523,1341.4643889546442)
test(788.9572799999972,788.9572823455832)
test(1127440.0008061249,1127439.974207658)
test(1221.4477740226914,1221.4514971317037)
test(1127.447774022691,1127.451497131704)
test(1174.4477740226869,1174.4514971317028)
test(8.134276651363734,8.134328389992106)
test(1200.2072799999983,1200.207282345582)
test(699.3367305084776,699.3367039999537)
test(141,140.99999999999994)
test(280.9864113892224,280.9867587552304)
test(1737129.164074338,1737129.1506171017)
test(157.1999958356223,157.2000000000001)
test(320.6869790470143,320.68733768313894)
test(273.68697904701384,273.6873376831393)
test(596.2671110589758,596.2670981119936)
console.log('expected to fail:')
test(2,1)
test(2.5,2)
test(2.5,1.5)