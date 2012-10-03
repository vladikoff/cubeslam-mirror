var Game = require('./game')
  , Simulator = require('./simulator');

new Game()
  .pushState(new Simulator(document.getElementById('canv')))
  .run()