 #ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D map;
uniform vec3 ambient;
uniform vec3 details;
uniform vec3 diffuse;
varying vec2 vUv;

void main() {

    gl_FragColor = vec4(1.0);

    vec4 texelColor = texture2D( map, vUv );
    vec3 bodyColor = (diffuse*texelColor.r*0.3+(texelColor.g*ambient));
    gl_FragColor = vec4( bodyColor + vec3(step(0.9,texelColor.b)*details)*bodyColor*8.0,1.0);

    gl_FragColor.xyz = sqrt( gl_FragColor.xyz );

}