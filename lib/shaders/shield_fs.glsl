#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float uBrightness; 
uniform vec3 uColor;
uniform sampler2D tDecal;

void main( void ) {

    float refl = gl_FragCoord.x / 2000.0;

    float glassFactor = refl*0.3; 

    glassFactor += vUv.x*(0.2-vUv.y)*0.1;

    gl_FragColor = vec4( vec3(1.0), mix(glassFactor+.2,2.0,texture2D(tDecal,vUv).r));

}