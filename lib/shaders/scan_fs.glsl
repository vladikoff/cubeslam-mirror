#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;

void main()
{
    vec2 coord = gl_FragCoord.xy + vec2(cos(gl_FragCoord.x + time) * 2.0, sin(gl_FragCoord.y + time) * 25.0);
    coord.x /= resolution.x / resolution.y;
    coord.y /= resolution.x / resolution.y;
    
    vec2 a = vec2(abs(sin(time)*1.0)*resolution.y, 0.0);
    vec2 b = vec2(abs(sin(time)*1.0)*resolution.y, 1.0);
    
    vec2 p = coord;
    
    float len = length(b - a);
    float dist = abs((p.x - a.x) * (b.y - a.y) - (p.y - a.y) * (b.x - a.x)) / len;
    
    vec3 col = vec3(2.0, 4.0, 0.0);
    col /= dist;
    
    gl_FragColor = vec4(col, 1.0);
    
}