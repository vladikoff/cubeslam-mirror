#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float time;

float frac(float x) { return mod(x,1.0); }
float noise(vec2 x,float t) { return frac(sin(dot(x,vec2(1.38984*sin(t),1.13233*cos(t))))*653758.5453); }

void main(void) 
{
    float c=noise(vUv,time);
    c*=0.2+0.05*clamp(sin(vUv.y*3.141592+time*3.0)-0.4,0.0,1.0);
    gl_FragColor=vec4(vec3(c),1.0);    
}

