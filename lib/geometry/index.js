var loader = new THREE.JSONLoader();

function createModel(exportsName,jsonFile) {
    var json = JSON.parse(require(jsonFile));
    var callback  = function(geo){
        exports[exportsName] = geo
    };

    loader.createModel(json,callback)

}

createModel( 'terrain','./terrain3')
createModel( 'mountains','./mountains')

createModel( 'cloud','./cloud1')

createModel( 'animal_bear','./bear')
createModel( 'animal_rabbit','./rabbit')
createModel( 'animal_bird1','./bird1')
createModel( 'animal_bird2','./bird2')
createModel( 'animal_bird3','./bird3')
createModel( 'animal_bird4','./bird4')
createModel( 'animal_moose','./moose')

createModel( 'cpu','./cpu')
createModel( 'paw','./paw')

createModel( 'extra_deathball','./extra_deathball')
createModel( 'extra_extralife','./extra_extralife')
createModel( 'extra_fog','./extra_fog')
createModel( 'extra_ghostball','./extra_ghostball')
createModel( 'extra_mirroredcontrols','./extra_mirroredcontrols')
createModel( 'extra_multiball','./extra_multiball')
createModel( 'extra_paddleresize','./extra_paddleresize')
createModel( 'extra_fastball','./extra_fastball')
createModel( 'extra_timebomb','./extra_timebomb')
