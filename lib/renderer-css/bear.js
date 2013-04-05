var debug = require('debug')('renderer:css')

module.exports = Bear;

function Bear(element){
  this.el = element;
  this.expressions = [];
  this.index = 0
}

Bear.prototype = {
  change: function(to, world){
    var self = this;
    switch(to) {
      case 'angry':
        this.expressions = [];
        var exp = ['angry-1', 'angry-2', 'angry-3', 'angry-4', 'angry-5', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6', 'angry-6'];
        this.expressions.push.apply(this.expressions, exp.concat())
        this.expressions.push.apply(this.expressions, exp.concat().reverse())
        break;
      case 'jawdrop':
        this.expressions = [];
        var exp = ['jawdrop-1', 'jawdrop-2', 'jawdrop-3', 'jawdrop-4', 'jawdrop-5', 'jawdrop-5', 'jawdrop-5', 'jawdrop-5'];
        this.expressions.push.apply(this.expressions, exp.concat())
        this.expressions.push.apply(this.expressions, exp.concat().reverse())
        break;
      case 'flirt':
        this.expressions = [];
        var exp = ['flirt-1', 'flirt-2', 'flirt-3', 'flirt-4', 'flirt-5', 'flirt-6', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7', 'flirt-7'];
        this.expressions.push.apply(this.expressions, exp.concat())
        this.expressions.push.apply(this.expressions, exp.concat().reverse())
        break;
      default:
        if(!world.timeouts.bearExpression) {
          console.log(world.timeouts.bearExpression);
          world.timeouts.bearExpression = world.tick.setTimeout(function(){
            if(self.expressions.length<1)
              self.expressions.push('blink-2','blink-2', 'blink-1')
            world.tick.clearTimeout(world.timeouts.bearExpression);
            world.timeouts.bearExpression = null;
          }, 600 + Math.random() * 3500 );
          break;
        }
    }
  },
  render: function(world) {
    if(this.expressions.length > 0 && ++this.index % 4 == 0) {
      var expression = this.expressions.shift()
      this.el.setAttribute('class', expression.split('-')[0] + ' ' + expression );
      this.index = 0;
    } else {
      this.change(null, world)
    }
  },
}
