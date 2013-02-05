#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float uBrightness; 
uniform vec3 uColor;

void main( void ) {

    float refl = gl_FragCoord.x / 2000.0;

    float glassFactor = refl*0.3; 

    glassFactor += vUv.x*(0.2-vUv.y)*0.1;

    gl_FragColor = vec4( vec3(1.0), glassFactor+.2+ uBrightness);

}