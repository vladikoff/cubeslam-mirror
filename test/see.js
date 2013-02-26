var see = require('../lib/support/see');

var visited = [];

var states = {
  Root: { enter: function(ctx){visited.push('root enter')} },

  Setup: { enter: function(ctx){visited.push('setup enter')} },

  Loading: {
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
      enter: function(ctx){
        visited.push('friend invite '+ctx.pathname+' enter')
      },
      leave: function(ctx){
        visited.push('friend invite '+ctx.pathname+' leave')
      }
    }
  },

  Game: {

    Setup: {
      enter: function(ctx){
        visited.push('game setup enter')
      },

      leave: function(ctx){
        visited.push('game setup leave')
      }
    },

    Play: {
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
see('/game',states.Game.Setup)
see('/game/play',states.Game.Play)
see('/game/invite',states.Friend.Invite)


see('/loading')
path('root enter','setup enter','loading enter','loading leave')

// wait 1.5s (for loading.leave to complete)
setTimeout(function(){
  path('main menu enter','main menu leave','game setup enter','game play enter')

  see('/game/invite')
  path('game play leave','friend invite /game/invite enter')

  see('/friend/invite')
  path('friend invite /game/invite leave','game setup leave','friend invite /friend/invite enter')
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