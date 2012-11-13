#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float time;
uniform vec3 color;


void main( void ) {
    vec2 pos = vUv;
    float col = 1.0;
    
    float n = sin(time*4.0 + pos.y * 100.0);
    col *= 0.9 + 0.1 * sign(n) * floor(abs(n) + 0.98);
    
    //col *= 0.6 + 0.4 * 6.0 * pos.x * pos.y * (1.0 - pos.x) * (1.0 - pos.y);
    
   // col *= 1.8 + 0.2 * sin(5.0 * time - gl_FragCoord.y * 4.0);
    
    gl_FragColor = vec4(col*color, 1.0);
}