var format = require('./format');

module.exports = function attach(room,to){
  return new Logger(room).attach(to)
}

exports.Logger = Logger;

var API = '//tailstream.herokuapp.com/';

function Logger(room){
  if( !room.trim() ){
    throw new Error('room name required');
  }
  this.room = room.trim();
  this.prefix = '';
  this.suffix = '';
  this.timestamp = true;
  this.filters = [];
  this.transforms = [];
}

Logger.prototype.filter = function(filter){
  this.filters.push(filter);
  return this;
}

Logger.prototype.transform = function(transform){
  this.transforms.push(transform);
  return this;
}

Logger.prototype.send = function(msg){
  try {
    var req = new XMLHttpRequest()
    req.open('POST', API+'/'+this.room, true)
    req.send(msg)
  } catch(e){
    console.warn('could not send to tailstream',e)
  }
}

Logger.prototype.attach = function(to){
  to = to || console;

  var logger = this;

  ['debug','log','warn','error'].forEach(function(severity){
    var orig = to[severity];
    to[severity] = function log(){
      orig.apply(console,arguments);

      var msg = format.apply(null,arguments);

      for(var i=0; i<logger.filters.length; i++){
        var filter = logger.filters[i];
        if( typeof filter == 'function' ){
          if( filter(msg) === false ){
            // ignore message
            return;
          }
        } else if( typeof filter == 'object' ){
          if( !filter.test(msg) ){
            // ignore message
            return;
          }
        } else if( typeof filter == 'string' ){
          if( !~msg.indexOf(filter) ){
            // ignore message
            return;
          }
        }
      }


      for(var i=0; i<logger.transforms.length; i++){
        var transform = logger.transforms[i];
        if( typeof transform == 'function' ){
          var transformed = transform(msg);
          if( typeof transformed != 'undefined' ){
            msg = transformed;
          }
        }
      }

      var ts = '';
      if( logger.timestamp ){
        ts = new Date().toISOString() + ' ';
      }

      logger.send(ts + logger.prefix + msg + logger.suffix);
    }
  })
  return this;
}