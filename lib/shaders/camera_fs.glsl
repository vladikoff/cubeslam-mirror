#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform sampler2D tCamera;

void main(void) 
{
    vec2 pos = vUv;
    pos.x = (1.0-pos.x);
    
    float col = 1.0;
    float n = sin(1.0*4.0 + pos.y * 600.0);
    col *= 0.9 + 0.1 * sign(n) * floor(abs(n) + 0.98);

    vec3 color = texture2D(tCamera,pos).rgb; 
    float bw = (color.r + color.g + color.b )/3.0;
    vec3 saturate = mix(color,vec3(bw),0.8);
    gl_FragColor = vec4(saturate*col,1.0);
    
}

