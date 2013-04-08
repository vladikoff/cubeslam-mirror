// actions.emit('extras changed',world)

//
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


var container = $('#extras ul');
var clonables = container.children().detach();
var available = {};

exports.update = function(world){
  for(var i=0; i<world.extras.length; i++){
    var extra = world.extras.values[i];

    // already exists
    if( available[extra.index] ){
      var element = available[extra.index]
        , active = extra.data.icon == 'active'
        , removed = extra.data.icon == 'removed';

      // turned active?
      if( active && !element.hasClass('active') ){
        element.addClass('active')

      // turned inactive?
      } else if( !active && element.hasClass('active') ){
        element.removeClass('active')

      // been removed?
      } else if( removed && element.hasClass('visible') ){
        element.removeClass('active visible')
        setTimeout(function(element){
          element.remove()
          delete available[extra.index]
        }.bind(null,element), 400)

      // is being removed? (waiting for timeout)
      } else if( extra.removed ){
        // nothing to do here. just don't create a new one...

      }

    // missing, create it
    } else {
      var element = clonables.filter('.'+extra.data.id).clone();
      setTimeout(function(element){ element.addClass('visible') }.bind(null,element), 400)
      available[extra.index] = element;

    }
  }
}