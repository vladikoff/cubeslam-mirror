#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform vec2 resolution;
uniform float gridAmount;
uniform sampler2D tTape;

void main(void) {
    vec2 p = gl_FragCoord.xy / resolution.xy;
    gl_FragColor = vec4(texture2D(tTape,vUv).rgb + gridAmount*vec3(0.3) * sin( p.y * resolution.y*3.14 ),1.0);
    //gl_FragColor = vec4(texture2D(tTape,vUv).rgb ,1.0);


}