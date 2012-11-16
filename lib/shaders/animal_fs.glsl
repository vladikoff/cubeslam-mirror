#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;

uniform sampler2D tDiffuse;

uniform vec3 topColor;
uniform vec3 bottomColor;
uniform float offset;
uniform float exponent;

varying vec3 vWorldPosition;

void main() {

    vec3 diffuse = texture2D(tDiffuse,vUv).rgb;
    float h = normalize( vWorldPosition + offset ).y;
    gl_FragColor = vec4( vec3(mix( bottomColor, topColor, max( pow( h, exponent ), 0.0 ) ))*diffuse, 1.0 );
}