var Emitter = require('emitter');

module.exports = Actions;

function Actions(world){
  if( !world )
    throw new Error('world required');
  this.world = world;
  this.types = []; // type -> name lookup
}

Emitter(Actions.prototype);

Actions.prototype.register = function(module){
  var methods = Object.keys(module);
  for(var i=0; i < methods.length; i++){
    var name = methods[i]
      , fn = module[name];
    if( typeof name != 'string' )
      throw new Error('invalid module name: '+name)
    if( typeof fn != 'function' )
      throw new Error('invalid function: '+fn)
    if( name in this )
      throw new Error('method "'+name+'" already registered');
    var action = fn.bind(this,this.world)//create(this, name, template, fn);
    action.type = this.types.length;
    this.types[action.type] = action;
    this[name] = action;
  }
  return this;
}

function create(scope,name,template,fn){
  try {
    var g = 'return '+template.toString().replace(/\$name/g,name);
    var f = new Function("fn","scope",g);
  } catch(e){
    console.log('failed to create function "%s" from %s',name,template);
    throw e;
  }
  return f(fn,scope);
}

var template = function $name(){
  fn.apply(scope,[scope.world].concat(arguments));
  scope.emit('action','$name',arguments);
}