var settings = require('./settings')
  , Puppeteer = require('./puppeteer')
  , confirmation = require('confirmation')
  , debug = require('debug')('editor')
  , world = require('./world')
  , $ = require('jquery');

module.exports = Editor;

function Editor(puppeteer){
  this.puppeteer = puppeteer;
  this.levels = [] // keeps track of the GUI (puppeteer is still the level master)
  this.setup();
}

Editor.prototype = {

  destroy: function(){
    debug('destroy')
    for (var i = 0; i < this.levels.length; i++) {
      this.levels[i].remove();
      this.levels[i] = null;
    };

    if( this.gui ){
      $(this.gui.domElement).remove();
    }
  },

  // popup a window to input json
  load: function(){
    debug('load')
    var c = confirmation('Enter JSON to load','')
      , puppeteer = this.puppeteer
      , editor = this;

    c.el.find('.body').append('<textarea>');
    c.show(function(ok){
      if( ok ){
        var json = c.el.find('textarea').val()
        puppeteer.load(json)
        editor.update()
      }
      c.hide()
    })
    this.gui.close()
  },

  // popup a window w. json output
  save: function(){
    debug('save')
    var json = Puppeteer.save(this.puppeteer);
    var c;
    c = confirmation('Save or send this','')
      .show(function(ok){ this.hide() })
    $('<textarea style="width:300px;height:500px;">').html(json).appendTo(c.el.find('.body'));
    this.gui.close()
  },

  setup: function(){
    debug('setup')
    
    this.useTopView = false;

    this._setupGUI();
    this.gui.add(this,'load')
    this.gui.add(this,'save')
    this.gui.add(this,'add')
    this.gui.add(this,'useTopView').name("TOP VIEW").onChange(function(value){
      settings.data.overrideCamera = value?"top":"";
    })
  },

  // indicates there's a new level. `level` is the index
  add: function(level){
    debug('add',level)

    // no need if it's already there
    // (we'll get here when adding a new one
    // since the puppeteer will emit "added")
    if( this.levels[level] )
      return;

    level = level || this.levels.length;

    this.levels[level] = new Level(this,level);

    var obj = this.puppeteer.levels[level];
    if( !obj ){
      // create a default level
      console.warn('creating a new level')
      obj = {
        theme: {}, // will be populated by defaults in Level#load()
        actions: []
      }
    }
    this.levels[level].load(obj);

    // and don't forget to add to the puppeteer
    this.puppeteer.add(obj,level);
  },

  remove: function(level){
    debug('remove',level)
    // indicates a level has been removed. `level` is the index
    delete this.levels[level];
  },

  play: function(level){
    debug('play',level)
    this.puppeteer.goto(level.index);
  },

  clone: function(level){
    debug('clone',level)
    // TODO copy the events and stuff from level into a new one...
  },

  // updates the gui
  update: function(){
    debug('update')
    updateDisplays(this.gui);
    return this;
  },

  _setupGUI: function(){
    var gui = new dat.GUI({autoPlace: false, scrollable: true});
    gui.width = 332;
    $("#settingsLevelsGUI").append(gui.domElement);
    this.gui = gui;
    this.gui.close();
    $("#settingsLevelsGUI").find(".close-button:last").click( function(){
      $(this).html("Level")
    }).html("Level")
  },

}



function Level(editor,index){
  this.name = 'Level '+index;
  this.editor = editor;
  this.gui = editor.gui;
  this.index = index;
}

Level.prototype = {

  setup: function(){
    this.folder = this.gui.addFolder(this.name)
    this._setupMeta()
    this._setupPuck()
    this._setupTheme()
    this._setupActions()
    return this;
  },

  _setupMeta: function(){
    var f = this.folder.addFolder('meta');

    // play this level
    f.add(this,"_play").name("Play")

    // delete this level
    f.add(this,"_remove").name("Delete")

    // clone this level
    f.add(this,"_clone").name("Clone")

    // name to pop up whenever it starts
    f.add(this.level,'name').name('Level name')

    // a description of the level
    f.add(this.level,'description').name('Level description')
  },

  _setupPuck: function(){
    var f = this.folder.addFolder('puck');

    // the starting speed of the puck(s)
    f.add(this.level, 'speed').min(1).max(20);

    // the step to upgrade the speed on hit
    f.add(this.level, 'speedup').min(0).max(1);

    // the maximum speed a puck can reach
    f.add(this.level, 'maxspeed').min(0).max(100);

    // if this is set, the level ends when a player reached maxHits
    f.add(this.level, 'maxHits').min(0).max(100);

    // the maximum speed of the AI
    f.add(this.level, 'speedAI').min(0).max(100);
  },

  _setupTheme: function(){
    var f = this.folder.addFolder('theme');
    f.addColor(this.level.theme, 'shieldColor').name("Shield hit").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'puckColor').name("Puck").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'arenaColor').name("Arena").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'terrainColor1').name("Terrain1").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'terrainColor2').name("Terrain2").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'terrainColor3').name("Terrain3").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'treeBranchColor').name("Trees").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'iconColor').name("Icons").onChange(colorsUpdated);
  },

  _setupActions: function(){
    var f = this.folder.addFolder('actions')
    f.add(this,"add").name("Add Event")
    this.events = [];
  },

  add: function(event,i){
    var e = new Event(this,event);
    if( arguments.length > 1 )
      this.level.actions[i] = e.event;
    else
      this.level.actions.push(e.event);
    this.events.push(e);
  },

  remove: function(event){
    // remove from this.events
    var i = this.events.indexOf(event);
    if( ~i ) this.events.splice(i,1);
  },

  _play: function(){
    this.editor.play(this);
  },

  _remove: function(){
    this.editor.remove(this);
  },

  _clone: function(){
    this.editor.clone(this);
  },

  load: function(level){
    // make sure the theme gets its defaults
    // if it's undefined
    var theme = level.theme , u;
    for(var k in settings.theme)
      if( theme[k] === u )
        theme[k] = settings.theme[k];

    level.name = level.name || '';
    level.description = level.description || '';
    level.speed = level.speed || 10;
    level.speedup = level.speedup || .1;
    level.maxspeed = level.maxspeed || 40;
    level.maxHits = level.maxHits || 3;
    level.speedAI = level.speedAI || 5;

    this.level = level;
    this.setup()

    if( level.actions ){
      for(var i=0, l=level.actions.length; i < l; i++)
        this.add(level.actions[i],i);
    }
  }

}


function Event(level,obj){
  obj = obj || {}
  this.level = level;
  this.event = obj;
  this.event.time = obj.time || parseTime(obj.frame);
  this.event.action = obj.action || '',
  this.event.params = obj.params || []
  this.name = 'Event ' + (level.events.length+1);
  this.paramUI = []
  this.gui = level.folder.__folders.actions;
  this.folder = this.gui.addFolder(this.name)
  this.folder.add(this,'remove').name('Delete event')
  this.folder.add(this.event,'action').options(availableActions()).onChange(this.change.bind(this))
  this.event.action && this.change(this.event.action);
}

Event.prototype = {
  clear: function(){
    while( this.paramUI.length )
      this.folder.remove(this.paramUI.pop());
  },

  remove: function(){
    this.clear()

    // remove from dom
    this.gui.__ul.removeChild(this.folder.domElement.parentElement)

    // remove from folders
    delete this.gui.__folders[this.folder.name]

    // remove from level
    this.level.remove(this)
  },

  change: function(action){
    this.clear()

    // rename the event to include the action name
    var title = this.name;
    if( action ) title += ' - ' + action.replace(/([A-Z])/g,' $1');
    $('li.title',this.folder.__ul).text(title)

    // all events has a time property
    // TODO default to last events time?
    this.paramUI.push(this.folder.add(this.event,'time').min(0).name('Time (seconds)'))

    // shortcuts!
    var f = this.folder
      , p = this.paramUI;

    // update the params
    switch(action){
      case '': return; // nothin...

      // create params for kind, x, y and mass
      case 'forceCreate':
        this.event.params = or(this.event.params,['',0,0,1]);
        p.push(f.add(this.event.params,'0').options('repell','attract').name('Kind'))
        p.push(f.add(this.event.params,'1').min(0).max(settings.data.arenaWidth).name('X'))
        p.push(f.add(this.event.params,'2').min(0).max(settings.data.arenaWidth).name('Y'))
        p.push(f.add(this.event.params,'3').name('Mass'))
        break;

      // create params for kind, x, y
      case 'forceDestroy':
        this.event.params = or(this.event.params,['',0,0]);
        // TODO make a select box instead which only contains existing forces
        p.push(f.add(this.event.params,'0').options('repell','attract').name('Kind'))
        p.push(f.add(this.event.params,'1').min(0).max(settings.data.arenaWidth).name('X'))
        p.push(f.add(this.event.params,'2').min(0).max(settings.data.arenaWidth).name('Y'))
        break;

      // create params for id, x and y
      case 'obstacleCreate':
      case 'extraCreate':
        this.event.params = or(this.event.params,['',0,0]);
        p.push(f.add(this.event.params,'0').options(availableExtras()).name('Id'))
        p.push(f.add(this.event.params,'1').min(0).max(settings.data.arenaWidth).name('X').onChange( function(){onMarkerPosition(this.event.params)}.bind(this) ))
        p.push(f.add(this.event.params,'2').min(0).max(settings.data.arenaHeight).name('Y').onChange( function(){onMarkerPosition(this.event.params)}.bind(this) ))
        break;

      // create params for id
      case 'extraDestroy':
      case 'obstacleDestroy':
        this.event.params = or(this.event.params,['']);
        // TODO only ids that's already in use
        var ids = availableExtras().filter(function(){
          return true
        })
        // TODO if no ids are available. alert and return?
        p.push(f.add(this.event.params,'0').options(ids).name('Id'))
        break;

      // no params
      case 'gameOver':
        break;

      default:
        console.error('unsupported action "%s"',action)
    }
  }
}

function onMarkerPosition(value) {
  world.renderer.triggerEvent("showLevelEditorMarker",value);
}

function parseTime(frame){
  if( typeof frame === undefined )
    return 0;

  // all actions coming from puppeteer will use frames instead of time
  // but time is more graspable. convert!
  // TODO don't hardcode 60 fps...
  if( Array.isArray(frame) )
    frame = frame[0];
  return frame / 60 || 0;
}

function or(a,b){
  if( a === b )
    return a;
  if( a.length != b.length )
    return b;
  for(var i=0; i < b.length; i++)
    b[i] = a[i]
  return b;
}

function colorsUpdated() {
  settings.emit('colorsUpdated');
}

function lightsUpdated() {
  settings.emit('lightsUpdated');
}

function updateDisplays(gui){
  for(var f in gui.__folders)
    updateDisplays(gui.__folders[f])
  for(var i=0; i < gui.__controllers.length; i++)
    gui.__controllers[i].updateDisplay();
}

function availableExtras(){
  return Object.keys(require('./extras'));
}

function availableActions(){
  var actions = Object.keys(require('./geom-sim/actions')).filter(function(a){
    if( a.indexOf('puck') == 0 )
      return false;
    if( a.indexOf('bullet') == 0 )
      return false;
    return a.length > 4
        && ( a.indexOf('Create') != -1
          || a.indexOf('Destroy') != -1
          || a == 'gameOver' )
  });
  return [''].concat(actions)
}
