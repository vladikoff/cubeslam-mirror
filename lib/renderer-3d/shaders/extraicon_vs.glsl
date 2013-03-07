#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float time;


void main( void ) {
    vUv = uv;
    vec3 newPosition = position;
    newPosition.y += sin(time*5.0)*5.0;

    float Angle = sin(time);

    mat4 RotationMatrix = mat4( 
                cos( Angle ),  0.0, -sin( Angle ), 0.0,
                0.0,  1, 0.0, 0.0,
                sin( Angle ), 0.0, cos( Angle ), 0.0,
                 0.0, 0.0, 0.0, 1.0 );

    gl_Position = projectionMatrix * modelViewMatrix * RotationMatrix* vec4( newPosition , 1.0 );
}