
module.exports = RNG;

// http://stackoverflow.com/a/424445/80582
function RNG(seed) {
  this.state = seed ? seed : Math.floor(Math.random() * (this.m-1));
}

// LCG using GCC's constants
RNG.prototype = {
  m: 0x100000000, // 2**32;
  a: 1103515245,
  c: 12345
}

/**
 *  Generate a 32bit integer.
 */
RNG.prototype.integer = function() {
  this.state = (this.a * this.state + this.c) % this.m;
  return this.state;
}

/**
 *  Generate a float [0,1]
 */
RNG.prototype.random =
RNG.prototype.float = function() {
  return this.integer() / (this.m - 1);
}

/**
 * Generate a number within `start` (incl) and
 * `end` (excl).
 */
RNG.prototype.range = function(start, end) {
  return start + Math.floor((this.integer() / this.m) * (end - start));
}

/**
 * Pick a random item in `array`.
 */
RNG.prototype.choice = function(array) {
  return array[this.range(0, array.length)];
}