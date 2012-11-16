exports.terrain1 = new THREE.GeometryLoader().parse(JSON.parse(require('./terrain2')))
exports.extra_plus = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_plus')))
exports.animal_moose = new THREE.GeometryLoader().parse(JSON.parse(require('./moose')))

// aliases
exports.extraball = exports.extra_plus;
exports.speedball = exports.extra_plus;