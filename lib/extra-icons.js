// actions.emit('extras changed',world)


// fog:
//    multiple: false
//    show: when icon is in arena
//          (if there is a new extra w. data.id == fog in world.extras)
//    active: when icon has been hit
//          (while world.timeouts.fog exists)
//    remove: when fog has timed out or icon has been removed from arena or round is over
//          (when no extra w data.id == fog or world.timeouts.fog does not exist anymore)
//
// deathball:
//    multiple: false
//    show: when icon is in arena
//          (if there is a new extra w. data.id == deathball in world.extras)
//    active: when icon is in arena
//          (same as show)
//    remove: when icon has been removed from arena or round is over
//          (when no extra w data.id == deathball exist anymore)
//
// ghostball:
//    multiple: true (while multiball)
//    show: when icon is in arena
//          (if there is a new extra w. data.id == ghostball in world.extras)
//    active: when icon has been hit
//          (while theres a puck with data.ghostballTimeout)
//    remove: when ghost has timed out or icon has been removed from arena or round is over
//          (when no puck w data.ghostballTimeout or extra w. data.id == ghostball exist anymore)
//
// paddleresize:
//    multiple: true
//    show: when icon is in arena
//          (if there is a new extra w. data.id == paddleresize in world.extras)
//    active: when icon has been hit
//          (if there is a new extra w. data.id == paddleresize in world.extras)
//    remove: when paddleresize has timed out or icon has been removed from arena or round is over
//
// multiball:
//    multiple: true
//    show: when icon is in arena
//    active: when icon has been hit
//    remove: when icon has been removed from arena or round is over
//
// extralife:
//    multiple: false
//    show: when icon is in arena
//    active: never
//    remove: when icon has been hit or round is over
//
// timebomb:
//    multiple: true
//    show: when icon is in arena
//    active: when icon has been hit
//    remove: when timebomb explodes or icon has been removed from arena or round is over
//
// fireball:
//    multiple: true
//    show: when icon is in arena
//    active: never
//    remove: when icon has been hit or round is over
//
//  laser:
//    multiple: false
//    show: when icon is in arena
//    active: when icon has been hit
//    remove: when laser is over or round is over
//
//  mirroredcontrols:
//    multiple: false
//    show: when icon is in arena
//    active: when icon has been hit
//    remove: when round is over or another mirroredcontrols icon has been hit
//
//  bulletproof:
//    multiple: false
//    show: when icon is in arena
//    active: when icon has been hit
//    remove: when bulletproof has timed out or round is over
//
//

var debug = require('debug')('extra-icons')
  , $ = require('jquery');

var container = $('#extras ul');
//create this hidden container so list items can be translated
var hidden = $('<ul></ul>').hide().appendTo('body');
var clonables = container.children().appendTo(hidden);
var available = [];
var inUse = null;

exports.use = function(world){
  inUse = world;
}

exports.clear = function(){
  container.empty();
  available.length = 0;
}

exports.create = function(world,extra){
  if( world !== inUse ) { return }
  var id = extra.data.id;
  debug('create',id)
  var element = clonables.filter('.'+id).clone();
  setTimeout(function(element){
    element.addClass('visible')
  }.bind(null,element), 400)
  available.push({
    index: extra.index,
    id: id,
    element: element
  });
  container.append(element)
  redistribute()
}

exports.activate = function(world,extra){
  if( world !== inUse ) return
  debug('activate',extra)
  var element = find(extra);
  if( element ){
    element.addClass('active')
  } else {
    console.warn('missing icon for extra',extra)
  }
}

exports.remove = function(world,extra){
  if( world !== inUse ) return
  debug('remove',extra)
  var element = find(extra);
  if( element ){
    element.removeClass('active visible')
    setTimeout(function(element){
      element.remove()
    }.bind(null,element), 400)
    remove(element)
    redistribute()
  } else {
    console.warn('missing icon for extra',extra)
  }
}

function find(k){
  k = k.index || k;
  for(var i=0; i<available.length; i++){
    var a = available[i];
    if( a.index === k ){
      return a.element;
    }
    if( a.id === k ){
      return a.element;
    }
  }
  return null;
}

function remove(element){
  for(var i=0; i<available.length; i++){
    var a = available[i];
    if( a.element === element ){
      available.splice(i,1);
      return true
    }
  }
  return false;
}

function redistribute(){
  var top = 0;
  var h = 50; // TODO hard coding!
  for(var i=0; i<available.length; i++){
    var a = available[i];
    a.element.css('top',top);
    top += h;
  }
}