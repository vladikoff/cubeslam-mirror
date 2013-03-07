varying vec2 vUv;
varying vec3 vWorldPosition;

void main( void ) {
	vUv = uv;

    vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
    vWorldPosition = worldPosition.xyz;

	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}