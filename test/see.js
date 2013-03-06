var see = require('../lib/support/see2');

var visited = [];

var states = {
  Root: { name: 'root', enter: function(ctx){visited.push('root enter')} },

  Setup: { name: 'setup', enter: function(ctx){visited.push('setup enter')} },

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
      see('/game/play')
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
    }
  },

  Webcam: {

    Activate: {
      enter: function(ctx){
        visited.push('webcam activate enter')
        see('/webcam/waiting')
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
see('/webcam/activate',states.Webcam.Activate)
see('/webcam/waiting',states.Webcam.Waiting)
see('/game',states.Game.Setup)
see('/game/play',states.Game.Play)
see('/game/invite',states.Friend.Invite)


see('/loading')
see('/main-menu') // tests queing
path('root enter','setup enter','loading enter','loading leave')

// wait 1.5s (for loading.leave to complete)
setTimeout(function(){
  path('main menu enter','main menu leave','game setup enter','game play enter')

  see('/game/invite')
  path('game play leave','friend invite /game/invite enter')

  see('/friend/invite')
  path('friend invite /game/invite leave','game setup leave','friend invite /friend/invite enter')

  // test ignoring the same path
  see('/friend/invite')
  path()

  // now test abort() and queue
  see('/webcam/activate')
  see('/main-menu')
  path('friend invite /friend/invite leave','webcam activate enter','webcam waiting enter','webcam waiting leave')
  see.abort()
  see('/friend/invite')
  path('webcam waiting cleanup','friend invite /friend/invite enter')

},1500)


function path(){
  console.assert(eql(visited,arguments),'paths does not match:\n\tvisited: '+visited.join(',')+'\n\texpected: '+[].join.call(arguments,','))
  visited.length = 0;
}

function eql(a,b){
  if( a.length !== b.length )
    return false;
  for(var i=0; i<a.length; i++){
    if( a[i] !== b[i] )
      return false;
  }
  return true;
}