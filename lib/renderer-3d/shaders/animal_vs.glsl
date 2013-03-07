varying vec2 vUv;
varying vec3 vWorldPosition;
uniform float morphTargetInfluences[ 4 ];

void main( void ) {
	vUv = uv;

    vec3 morphed = vec3( 0.0 );
    morphed += ( morphTarget0 - position ) * morphTargetInfluences[ 0 ];
    morphed += ( morphTarget1 - position ) * morphTargetInfluences[ 1 ];
    //morphed += ( morphTarget2 - position ) * morphTargetInfluences[ 2 ];
    //morphed += ( morphTarget3 - position ) * morphTargetInfluences[ 3 ];
    morphed += position;

    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;

 	gl_Position = projectionMatrix * modelViewMatrix * vec4( morphed, 1.0 );
}