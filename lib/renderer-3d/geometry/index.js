var raf = require('request-animation-frame'),
    Emitter = require('emitter')

Emitter(exports);

var loader = new THREE.JSONLoader();
var cache = {};

function createModel(data){

  console.time('create model '+data.id)
  loader.createModel(data.json,function(geo,materials){
    exports[data.id] = geo;
    if( data.material && materials.length ){
      exports[data.id+'_materials'] = materials;
    }
    console.timeEnd('create model '+data.id)
  })

/*
  if( data.material ){
    if( !exports[data.id+'_materials'] ){
      // "get" the model to fill the cache
      exports[data.id];
    }
  }*/
}

exports.isDone = false;

var parseData = [
  {id:'terrain',path:'./terrain3'},
  //{id:'terrainLow',path:'./terrain-low'},
  {id:'cloud1',path:'./cloud1'},
  {id:'cloud2',path:'./cloud2'},
  {id:'cloud3',path:'./cloud3'},
  {id:'animal_bear',path:'./bear'},
  {id:'animal_rabbit',path:'./rabbit'},
  {id:'animal_bird1',path:'./bird1'},
  {id:'animal_moose',path:'./moose'},
  {id:'cpu',path:'./cpu',material:true},
  {id:'paw',path:'./paw'},
  {id:'extra_deathball',path:'./extra_deathball'},
  {id:'extra_extralife',path:'./extra_extralife'},
  {id:'extra_bulletproof',path:'./extra_shield'},
  {id:'extra_fog',path:'./extra_fog'},
  {id:'extra_ghostball',path:'./extra_ghostball'},
  {id:'extra_mirroredcontrols',path:'./extra_mirroredcontrols'},
  {id:'extra_multiball',path:'./extra_multiball'},
  {id:'extra_paddleresize',path:'./extra_paddleresize'},
  {id:'extra_fireball',path:'./extra_fireball'},
  {id:'extra_random',path:'./extra_random'},
  {id:'extra_timebomb',path:'./extra_timebomb'},
  {id:'extra_laser',path:'./extra_laser'}
];

var step = -1;
var totalModels = parseData.length;

console.time("parse geometry");

function parseStep() {

  if( step < totalModels-1  ) {
    step++
    var data = parseData[step]
    console.time('parse '+data.id)
    data.json = JSON.parse(require(data.path));
    console.timeEnd('parse '+data.id)
    raf(parseStep);
  }
  else {
    console.timeEnd("parse geometry");
    step = -1;
    console.time("create geometry");
    createModelStep()
  }
}

function createModelStep() {

  if( step < totalModels-1  ) {
    step++
    var data = parseData[step]
    createModel(data);
    raf(createModelStep);
  }
  else {
    console.timeEnd("create geometry");
    exports.isDone = true;
    exports.emit("isDone");
  }
}

parseStep();

