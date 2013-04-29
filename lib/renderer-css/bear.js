var debug = require('debug')('renderer:css')

module.exports = Bear;

function Bear(element){
  this.el = element;
  this.expression = {list:[]};
  this.index = 0
}

Bear.prototype = {
  change: function(to, world){
    var self = this;
    switch(to) {
      case 'angry':
        // this.expressions = [];
        this.expression = {
          name: 'angry',
          list: [0,1,2,3,4,4,4,4,4,4,4,4,4,4,4,3,2,1,0]
        }
        break;
      case 'jawdrop':
        this.expression = {
          name: 'jawdrop',
          list: [0,1,2,3,4,4,4,4,4,4,4,4,4,4,4,4,3,2,1,0]
        }
        break;
      case 'flirt':
        this.expression = {
          name: 'flirt',
          list: [0,1,2,3,4,5,6,6,6,6,6,6,6,6,6,6,6,6,6,6,6,5,4,3,2,1,0]
        }
    }
  },
  render: function(world) {
    this.index++;
    if(this.expression.list.length > 0 && this.index % 4 === 0) {
      var name = this.expression.name
        , expression = expressions[name]
        , bg = this.expression.list.shift()
        , style = this.el.style;
      style.backgroundPosition = expression['bg'][bg];

      if( name != this.current ) {
        this.current = name;
        style.width = expression.width;
        style.height = expression.height

        this.el.setAttribute('class', name);
        this.index = 0;
      }
    } else {
      if((this.index) % (14*7) === 0) {
        this.expression = {
          name: 'blink',
          list: [0,0,0,1,1,0,0,0,0,0,0,0,0,0]
        }
      }
    }
  }
}

var expressions = {
  angry: {
    bg: [
      '-320px -99px',
      '-214px -99px',
      '-108px -150p',
      '-610px -2px',
      '-504px -2px',
      '-398px -2px',
      '-292px -2px',
      '-186px -2px'
    ],
    width: '104px',
    height: '95px'
  },
  blink: {
    bg: [
      '-634px -222px',
      '-634px -202px'
    ],
    width: '56px',
    height: '18px'
  },
  flirt: {
    bg: [
      '-610px -151px',
      '-565px -202px',
      '-541px -151px',
      '-496px -202px',
      '-427px -202px',
      '-472px -151px',
      '-358px -196px'
    ],
    width: '67px',
    height: '49px'
  },
  jawdrop: {
    bg: [
      '-286px -196px',
      '-214px -196px',
      '-642px -99px',
      '-570px -99px',
      '-498px -99px',
      '-426px -99px'
    ],
    width: '70px',
    height: '50px'
  }
}
