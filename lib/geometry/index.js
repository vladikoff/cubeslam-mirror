exports.terrain1 = new THREE.GeometryLoader().parse(JSON.parse(require('./terrain2')))
exports.animal_moose = new THREE.GeometryLoader().parse(JSON.parse(require('./moose')))
exports.animal_bear = new THREE.GeometryLoader().parse(JSON.parse(require('./bear')))

exports.extra_deathball = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_deathball')))
exports.extra_extralife = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_extralife')))
exports.extra_fog = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_fog')))
exports.extra_ghostball = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_ghostball')))
exports.extra_mirroredcontrols = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_mirroredcontrols')))
exports.extra_multiball = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_multiball')))
exports.extra_paddleresize = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_paddleresize')))
exports.extra_speed = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_speed')))
exports.extra_timebomb = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_timebomb')))

// aliases
exports.deathball   = exports.extra_deathball;
exports.extralife  = exports.extra_extralife;
exports.fog         = exports.extra_fog;
exports.ghostball   = exports.extra_ghostball;
exports.mirroredcontrols   = exports.extra_mirroredcontrols;
exports.multiball   = exports.extra_multiball;
exports.paddleresize  = exports.extra_paddleresize;
exports.fastball   = exports.extra_speed;
exports.timebomb   = exports.extra_timebomb;
