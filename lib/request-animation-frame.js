
var requestAnimationFrame = function(fn){ setTimeout(fn, 1000 / 60) };

module.exports = typeof window != 'undefined'
  ? window.requestAnimationFrame
    || window.webkitRequestAnimationFrame
    || window.mozRequestAnimationFrame
    || window.oRequestAnimationFrame
    || window.msRequestAnimationFrame
    || requestAnimationFrame
  : requestAnimationFrame;