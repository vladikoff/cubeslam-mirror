var see = require('../lib/support/see');

var visited = []
  , events = { enter: [], leave: [] };

var states = {
  Root: {
    name: 'root',
    enter: function(ctx){
      visited.push('root enter')
    },
    leave: function(ctx){
      throw new Error('should never leave root')
    }
  },

  Setup: {
    name: 'setup',
    enter: function(ctx){
      visited.push('setup enter')
    },
    leave: function(ctx){
      throw new Error('should never leave setup')
    }
  },

  Loading: {
    name: 'loading',
    enter: function(ctx){
      visited.push('loading enter')
      see('/main-menu')
    },
    leave: function(ctx,next){
      visited.push('loading leave')
      setTimeout(next,1000)
    }
  },

  MainMenu: {
    name: 'main menu',
    enter: function(ctx){
      visited.push('main menu enter')
    },
    leave: function(ctx){
      visited.push('main menu leave')
    }
  },

  Friend: {
    Invite: {
      name: 'friend invite',
      enter: function(ctx){
        visited.push('friend invite '+ctx.pathname+' enter')
      },
      leave: function(ctx){
        visited.push('friend invite '+ctx.pathname+' leave')
      }
    },

    Waiting: {
      name: 'friend waiting',
      enter: function(ctx){
        visited.push('friend waiting enter')
      },
      leave: function(ctx){
        visited.push('friend waiting leave')
      }
    }
  },

  Prompt: {

    enter: function(ctx){ visited.push('prompt enter') },
    leave: function(ctx){ visited.push('prompt leave') },

    Level: {
      enter: function(ctx){
        visited.push('prompt level enter');
        see('/game/prompt/round')
      },
      leave: function(ctx,next){
        visited.push('prompt level leave');
        this.timeout = setTimeout(next,200)
      },
      cleanup: function(ctx){
        visited.push('prompt level cleanup');
        clearTimeout(this.timeout)
      }
    },

    Round: {
      enter: function(ctx){
        visited.push('prompt round enter');
        see('/game/prompt/start')
      },
      leave: function(ctx,next){
        visited.push('prompt round leave');
        this.timeout = setTimeout(next,200)
      },
      cleanup: function(ctx){
        visited.push('prompt round cleanup');
        clearTimeout(this.timeout)
      }
    },

    Start: {
      enter: function(ctx){
        visited.push('prompt start enter');
        see('/game/play')
      },
      leave: function(ctx,next){
        visited.push('prompt start leave');
        this.timeout = setTimeout(next,200)
      },
      cleanup: function(ctx){
        visited.push('prompt start cleanup');
        clearTimeout(this.timeout)
      }
    }

  },

  Webcam: {

    Activate: {
      enter: function(ctx){
        visited.push('webcam activate enter')
        this.timeout = setTimeout(function(){
          see('/webcam/waiting')
        },20)
      },
      cleanup: function(ctx){
        clearTimeout(this.timeout)
      }
    },

    Waiting: {
      enter: function(ctx){
        visited.push('webcam waiting enter')
        see('/game/play')
      },

      leave: function(ctx,next){
        visited.push('webcam waiting leave')
        this.timeout = setTimeout(next,10000);
      },

      cleanup: function(ctx){
        visited.push('webcam waiting cleanup')
        clearTimeout(this.timeout)
      }
    }

  },

  Game: {

    Setup: {
      name: 'game setup',
      enter: function(ctx){
        visited.push('game setup enter')
      },

      leave: function(ctx){
        visited.push('game setup leave')
      }
    },

    Other: {
      name: 'game other',
      enter: function(ctx){
        visited.push('game other enter')
      },

      leave: function(ctx){
        visited.push('game other leave')
      }
    },

    Play: {
      name: 'game play',
      enter: function(ctx){
        visited.push('game play enter')
      },

      leave: function(ctx){
        visited.push('game play leave')
      }
    }

  }
}

see('/',states.Root)
see('/',states.Setup)
see('/loading',states.Loading)
see('/main-menu',states.MainMenu)
see('/friend/invite',states.Friend.Invite)
see('/friend/waiting',states.Friend.Waiting)
see('/webcam/activate',states.Webcam.Activate)
see('/webcam/waiting',states.Webcam.Waiting)
see('/game',states.Game.Setup)
see('/game',states.Game.Other)
see('/game/play',states.Game.Play)
see('/game/invite',states.Friend.Invite)
see('/game/prompt',states.Prompt)
see('/game/prompt/level',states.Prompt.Level)
see('/game/prompt/round',states.Prompt.Round)
see('/game/prompt/start',states.Prompt.Start)

see.on('enter',function(ctx){ events.enter.push(ctx.pathname) })
see.on('leave',function(ctx){ events.leave.push(ctx.pathname) })

// test see.bind()
console.assert(see.bind('/loading') === see.bind('/loading'), 'see.bind(x) === see.bind(x)')
console.assert(see.bind('/loading') !== see.bind('/main-menu'), 'see.bind(x) !== see.bind(y)')

see('/loading')
see('/main-menu') // tests queing
path('root enter','setup enter','loading enter','loading leave')
enter('/','/','/loading')
leave() // empty because of async leave

// wait 1.5s (for loading.leave to complete)
setTimeout(function(){
  path('main menu enter')
  enter('/main-menu')
  leave('/loading')

  see('/game/play')
  path('main menu leave','game setup enter','game other enter','game play enter')
  enter('/game','/game','/game/play')
  leave('/main-menu')

  see('/game/invite')
  path('game play leave','friend invite /game/invite enter')
  enter('/game/invite')
  leave('/game/play')

  see('/friend/invite')
  path('friend invite /game/invite leave','game other leave','game setup leave','friend invite /friend/invite enter')
  enter('/friend/invite')
  leave('/game/invite','/game','/game')

  // test ignoring the same path
  see('/friend/invite')
  path()
  enter()
  leave()

  // now test abort() and queue
  see('/webcam/activate')
  see('/main-menu')
  path('friend invite /friend/invite leave','webcam activate enter','main menu enter')
  enter('/webcam/activate','/main-menu')
  leave('/friend/invite','/webcam/activate') // <<--- correct?


  see.abort()
  see('/friend/invite')
  path('main menu leave','friend invite /friend/invite enter')
  enter('/friend/invite')
  leave('/main-menu') // no /webcam/waiting because of abort()

  see('/game/prompt/level')
  path('friend invite /friend/invite leave','game setup enter','game other enter','prompt enter','prompt level enter','prompt level leave')
  enter('/game','/game','/game/prompt','/game/prompt/level')
  leave('/friend/invite')

  setTimeout(function(){
    path('prompt level cleanup','prompt round enter','prompt round leave','prompt round cleanup','prompt start enter','prompt start leave','prompt start cleanup','prompt leave','game play enter')
    enter('/game/prompt/round','/game/prompt/start','/game/play')
    leave('/game/prompt/level','/game/prompt/round','/game/prompt/start','/game/prompt')

    // test a regression
    see('/main-menu')
    path('game play leave','game other leave','game setup leave','main menu enter')
    enter('/main-menu')
    leave('/game/play','/game','/game')

    see('/friend/waiting')
    path('main menu leave','friend waiting enter')
    enter('/friend/waiting')
    leave('/main-menu')

    see('/webcam/activate')
    path('friend waiting leave','webcam activate enter')
    enter('/webcam/activate')
    leave('/friend/waiting')

  },700)

},1500)

function enter(){
  console.assert(eql(events.enter,arguments),'enter events does not match:\n\t visited: '+events.enter.join(',')+'\n\texpected: '+[].join.call(arguments,',')+'\n\n')
  events.enter.length = 0;
}

function leave(){
  console.assert(eql(events.leave,arguments),'leave events does not match:\n\t visited: '+events.leave.join(',')+'\n\texpected: '+[].join.call(arguments,',')+'\n\n')
  events.leave.length = 0;
}

function path(){
  console.assert(eql(visited,arguments),'paths does not match:\n\t visited: '+visited.join(',')+'\n\texpected: '+[].join.call(arguments,',')+'\n\n')
  visited.length = 0;
}

function eql(a,b){
  if( a.length !== b.length ){
    return false;
  }
  for(var i=0; i<a.length; i++){
    if( a[i] !== b[i] ){
      return false;
    }
  }
  return true;
}