#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform sampler2D tGrid;
uniform vec2 scale; 


float thing(vec2 pos) 
{
    float a = clamp(sin(pos.y / 70.) + sqrt(15.+tan(pos.x)), 0.0, 22.);
    float b = clamp(cos(pos.x / 70.) + sqrt(25.+tan(pos.y)), 0.3, 10.);
    return (a + b);
}

void main(void) 
{
    vec2 position = vUv;
    position += 0.25;
    vec2 world = position*scale*3.1417;
    float color = 1./thing(world);

    /*dist += step( mod(position.x+0.241, 1./scale.x),0.002)*.3;
    color += step( mod(position.x+0.24, 1./scale.x),0.002)*.1;
    color += step( mod(position.x+0.239, 1./scale.x),0.002)*.1;*/

    color = texture2D( tGrid, vUv*scale ).x;

    float color2 = step( vUv.y,0.505);
    color2 -= step(vUv.y,0.495);

    vec3 gridColor = vec3(color, color, color);
    vec3 centerColor = vec3(color2);
    vec3 lineColor = vec3(0.89453125,0.89453125,0.7734375);
    gl_FragColor = vec4( (gridColor + centerColor)*lineColor , (.1+color2) );
    
}

