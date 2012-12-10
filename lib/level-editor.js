var Puppeteer = require('./puppeteer')
  , settings = require('./settings')

module.exports = LevelEditor;


function LevelEditor(){
  this.level = {};
}

LevelEditor.prototype = {

  setup: function(){
    console.log('LevelEditor#setup()')
    this.setupGUI();
    this.setupMeta()
    this.setupPuck()
    this.setupTheme()
    this.setupActions()
    return this;
  },

  setupGUI: function(){
    var gui = new dat.GUI({autoPlace: false, scrollable: true});
    gui.width = 332;
    $("#settingsLevelsGUI").append(gui.domElement);
    this.gui = gui;
    this.gui.close();
    $("#settingsLevelsGUI").find(".close-button:last").click( function(){
      $(this).html("Level")
    }).html("Level")
  },

  setupMeta: function(){
    this.gui.add(this,"play").name("Play Level")

    var f = this.gui.addFolder('meta');
    // name to pop up whenever it starts
    f.add(this.level,'name').name('Level name')

    // a description of the level
    f.add(this.level,'description').name('Level description')
  },

  setupPuck: function(){
    var f = this.gui.addFolder('puck');

    // the starting speed of the puck(s)
    f.add(this.level, 'speed').min(1).max(20);

    // the step to upgrade the speed on hit
    f.add(this.level, 'speedup').min(0).max(1);

    // the maximum speed a puck can reach
    f.add(this.level, 'maxspeed').min(0).max(100);

    // if this is set, the level ends when a player reached maxHits
    f.add(this.level, 'maxHits').min(0).max(100);
  },

  setupTheme: function(){
    var f = this.gui.addFolder('theme');
    f.addColor(this.level.theme, 'shieldColor').name("Shield hit").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'puckColor').name("Puck").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'arenaColor').name("Arena").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'terrainColor1').name("Terrain1").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'terrainColor2').name("Terrain2").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'terrainColor3').name("Terrain3").onChange(colorsUpdated);
    f.addColor(this.level.theme, 'treeBranchColor').name("Trees").onChange(colorsUpdated);
  },

  setupActions: function(){
    var f = this.gui.addFolder('actions')
    f.add(this,"addEvent").name("Add Event")
    this.events = [];
  },

  addEvent: function(event,i){
    console.log('LevelEditor#addEvent()')
    var e = new Event(this.gui.__folders.actions,event);
    if( arguments.length > 1 )
      this.level.actions[i] = e.event;
    else
      this.level.actions.push(e.event);
    this.events.push(e);
  },

  removeEvent: function(event){
    // remove from this.events
    var i = this.events.indexOf(event);
    if( ~i ) this.events.splice(i,1);
  },

  // updates the gui
  update: function(){
    console.log('LevelEditor#update()')
    updateDisplays(this.gui);
    return this;
  },

  play: function(){
    console.log('LevelEditor#play()')
    // TODO load the level as it is in the editor
    // into the LevelEditor and play!
  },

  reset: function(){
    console.log('LevelEditor#reset()')
    if( this.gui ){
      document.getElementById("settingsLevelsGUI").removeChild(this.gui.domElement);
      console.log('removed gui',this.gui.domElement)
      this.gui = null;
    }
  },

  load: function(level){
    console.log('LevelEditor#load()',level,this.level)
    this.reset();

    this.level = level;

    // copy theme
    if( level.theme ){
      for(var k in level.theme)
        this.level.theme[k] = level.theme[k];
    }

    this.setup()

    if( level.actions ){
      for(var i=0, l=level.actions.length; i < l; i++)
        this.addEvent(level.actions[i],i);
    }

    return this.update();
  }

}


function Event(gui,obj){
  obj = obj || {}
  this.gui = gui;
  this.event = obj;
  this.event.time = obj.time || parseTime(obj.frame);
  this.event.action = obj.action || '',
  this.event.params = obj.params || []
  this.name = 'Event ' + (++Event.INSTANCES);
  this.paramUI = []
  this.folder = gui.addFolder(this.name)
  this.folder.add(this,'remove').name('Delete event')
  this.folder.add(this.event,'action').options(availableActions()).onChange(this.setAction.bind(this))
  this.event.action && this.setAction(this.event.action);
}

Event.INSTANCES = 0

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
  },

  setAction: function(action){
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
        p.push(f.add(this.event.params,'1').min(0).max(settings.data.arenaWidth).name('X'))
        p.push(f.add(this.event.params,'2').min(0).max(settings.data.arenaWidth).name('Y'))
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

      // create params for x and y
      case 'puckCreate':
        this.event.params = or(this.event.params,[0,0]);
        p.push(f.add(this.event.params,'0').min(0).max(settings.data.arenaWidth).name('X'))
        p.push(f.add(this.event.params,'1').min(0).max(settings.data.arenaWidth).name('Y'))
        break;

      // no params
      case 'gameOver':
        break;

      default:
        console.error('unsupported action "%s"',action)
    }
  }
}

function parseTime(frame){
  if( typeof frame === undefined )
    return 0;

  // all actions coming from puppeteer will use frames instead of time
  // but time is more graspable. convert!
  // TODO don't hardcode 60 fps...
  console.log('parseTime',frame)
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
    return a.length > 4
        && ( a.indexOf('Create') != -1
          || a.indexOf('Destroy') != -1
          || a == 'gameOver' )
  });
  return [''].concat(actions)
}
