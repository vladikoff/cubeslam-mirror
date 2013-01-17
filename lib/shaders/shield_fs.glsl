#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float uBrightness; 
uniform vec3 uColor;

void main( void ) {

     vec2 p = gl_FragCoord.xy / vec2(1000.0,550.0);

    float glassFactor = p.x*(0.7-p.y)*0.4;

    glassFactor += vUv.x*(0.7-vUv.y)*0.2;
 


    gl_FragColor = vec4( vec3(1.0), glassFactor+0.1);

}