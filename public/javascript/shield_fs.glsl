#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float brightness; 

float max3(float a,float b,float c)
{
    return max(a, max(b,c));
}



float rect( vec2 p, vec2 b, float smooth )
{
    vec2 v = abs(p) - b;
    float d = length(max(v,0.0));
    return 1.0-pow(d, smooth);
}

void main( void ) {

    vec2 pos = vec2(1.0-vUv.x, vUv.y);
    float glow = 0.061;
    float d1 = rect(pos-vec2(0.05,1.0), vec2(0.025,1.0), glow); 
    vec3 clr1 = vec3(1.0,1.0,0.0) *d1; 

    
    float d2 = rect( pos-vec2(0.50,1.0), vec2(0.025,1.0), glow); 
    vec3 clr2 = vec3(0.0,0.0,1.0) *d2; 

    float d3 = rect( pos-vec2(0.8,1.0), vec2(0.025,1.0), glow); 
    vec3 clr3 = vec3(1.0,0.0,0.0) * d3; 
    float glassFactor = vUv.x*(1.0-vUv.y)*0.1;
    vec3 clr = clr1+clr2+clr3 + vec3(2.0)*glassFactor;
    
    
    float scaline = abs(sin(pos.y * 200.0 ))/10.0;

    gl_FragColor = vec4( (clr+scaline)*(brightness), ((d1+d2+d3)*0.5 + glassFactor)*(vUv.y+0.7));

}