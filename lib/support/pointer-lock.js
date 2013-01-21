// component.js port from
// https://github.com/chrisdickinson/pointer-lock

var Emitter = require('emitter');

module.exports = pointer

pointer.available = !!shim(document.body)

function pointer(el) {
  var ael = el.addEventListener || el.attachEvent
    , rel = el.removeEventListener || el.detachEvent
    , doc = el.ownerDocument
    , body = doc.body
    , rpl = shim(el)
    , ee = Emitter({})
    , needsFullscreen = false
    , mouseDownMS

  ael.call(el, 'mousedown', onmousedown, false)
  ael.call(el, 'mouseup', onmouseup, false)
  ael.call(body, 'mousemove', onmove, false)

  var vendors = ['', 'webkit', 'moz', 'ms', 'o']

  for(var i = 0, len = vendors.length; i < len; ++i) {
    ael.call(doc, vendors[i]+'pointerlockchange', onpointerlockchange)
    ael.call(doc, vendors[i]+'pointerlockerror', onpointerlockerror)
  }

  ee.release = release
  ee.target = pointerlockelement
  ee.request = onmousedown
  ee.destroy = function() {
    rel.call(el, 'mouseup', onmouseup, false)
    rel.call(el, 'mousedown', onmousedown, false)
    rel.call(el, 'mousemove', onmove, false)
  }

  if(!shim) {
    setTimeout(function() {
      ee.emit('error', new Error('pointer lock is not supported'))
    }, 0)
  }
  return ee

  function onmousedown(ev) {
    if(pointerlockelement()) {
      return
    }
    mouseDownMS = +new Date
    rpl.call(el)
  }

  function onmouseup(ev) {
    if(!needsFullscreen) {
      return
    }

    ee.emit('needs-fullscreen')
    needsFullscreen = false
  }

  function onpointerlockchange(ev) {
    if(!pointerlockelement()) {
      release()
      return
    }
  }

  function onpointerlockerror(ev) {
    var dt = +(new Date) - mouseDownMS
    if(dt < 100) {
      // we errored immediately, we need to do fullscreen first.
      needsFullscreen = true
      return
    }
    ee.emit('error')
  }

  function release() {
    ee.emit('release')

    var pel = pointerlockelement()
    if(!pel) {
      return
    }

    (doc.exitPointerLock ||
    doc.mozExitPointerLock ||
    doc.webkitExitPointerLock ||
    doc.msExitPointerLock ||
    doc.oExitPointerLock).call(doc)
  }

  function onmove(ev) {
    // reusing a single object
    // to avoid piling up
    // a ton of objects for the garbage
    // collector.
    var dx =
      ev.movementX || ev.webkitMovementX ||
      ev.mozMovementX || ev.msMovementX ||
      ev.oMovementX || 0;
    var dy =
      ev.movementY || ev.webkitMovementY ||
      ev.mozMovementY || ev.msMovementY ||
      ev.oMovementY || 0;
    ee.emit('move', dx,dy)
  }

  function pointerlockelement() {
    return 0 ||
      doc.pointerLockElement ||
      doc.mozPointerLockElement ||
      doc.webkitPointerLockElement ||
      doc.msPointerLockElement ||
      doc.oPointerLockElement ||
      null
  }
}

function shim(el) {
  return el.requestPointerLock ||
    el.webkitRequestPointerLock ||
    el.mozRequestPointerLock ||
    el.msRequestPointerLock ||
    el.oRequestPointerLock ||
    null
}