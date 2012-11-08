#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;

varying vec2 vUv;

float halfpi = asin(1.0);
float pixel = 1.0 / resolution.y;

float circle(vec2 uv, vec2 pos, float d){
    // Modified to add anti-aliasing.
    return 1.0 - smoothstep(d, d + pixel * 1.5, length(uv - pos));
}

void main( void ) {
    
    vec2 aspect = vec2(resolution.x/resolution.y,1.);
    vec2 uv = 0.5 + ( vUv -0.5 )*aspect;
    vec2 mouse = 0.5 + (mouse-0.5)*aspect;

    vec2 pos1 = vec2( mouse.x*0.5 + 0.1, mouse.y*.2 + 0.5);
    vec2 pos2 = vec2( mouse.x*0.5 + 0.5, mouse.y*.2 + 0.5);
    
    
    float layer1 = 0.0;
    layer1 += circle(uv, pos1 , 0.035);
    layer1 += circle(uv, pos2 , 0.035);
    
    gl_FragColor = vec4(layer1);

    
    gl_FragColor.a = 1.0;

}