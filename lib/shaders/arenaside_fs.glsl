#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform vec2 scale; 

void main(void) 
{
    vec2 position = vUv;

    float color2 = step( vUv.y,0.505);
    color2 -= step(vUv.y,0.495);

    vec3 centerColor = vec3(color2);
    vec3 lineColor = vec3(0.89453125,0.89453125,0.7734375);
    gl_FragColor = vec4( centerColor*lineColor , 0.1+color2 );
    
}

