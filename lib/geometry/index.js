var loader = new THREE.JSONLoader();
var cache = {};

function createModel(id,path,mat){
  exports.__defineGetter__(id,function(){
    if( !cache[id] ){
      var json = JSON.parse(require(path));
      loader.createModel(json,function(geo,materials){
        cache[id] = geo;
        if( mat && materials.length ){
          cache[id+'_materials'] = materials;
        }
      })
    }

    return cache[id];
  })

  if( mat ){
    exports.__defineGetter__(id+'_materials',function(){
      if( !cache[id+'_materials'] ){
        // "get" the model to fill the cache
        exports[id];
      }
      return cache[id+'_materials']
    })
  }
}

console.time("parse geometry");

createModel( 'terrain','./terrain3')
createModel( 'mountains','./mountains')

createModel( 'cloud','./cloud')

createModel( 'animal_bear','./bear')
createModel( 'animal_rabbit','./rabbit')
createModel( 'animal_bird1','./bird1')
createModel( 'animal_bird2','./bird2')
createModel( 'animal_bird3','./bird3')
createModel( 'animal_bird4','./bird4')
createModel( 'animal_moose','./moose')

createModel( 'cpu','./cpu',true)
createModel( 'paw','./paw')

createModel( 'extra_deathball','./extra_deathball')
createModel( 'extra_extralife','./extra_extralife')
createModel( 'extra_bulletproof','./extra_shield')
createModel( 'extra_fog','./extra_fog')
createModel( 'extra_ghostball','./extra_ghostball')
createModel( 'extra_mirroredcontrols','./extra_mirroredcontrols')
createModel( 'extra_multiball','./extra_multiball')
createModel( 'extra_resize','./extra_resize')
createModel( 'extra_fireball','./extra_fireball')
createModel( 'extra_random','./extra_random')
createModel( 'extra_timebomb','./extra_timebomb')

console.timeEnd("parse geometry");