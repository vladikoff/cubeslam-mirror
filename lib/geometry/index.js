exports.terrain1 = new THREE.GeometryLoader().parse(JSON.parse(require('./terrain1')))
exports.extra_plus = new THREE.GeometryLoader().parse(JSON.parse(require('./extra_plus')))

// aliases
exports.extraball = exports.extra_plus;
exports.speedball = exports.extra_plus;