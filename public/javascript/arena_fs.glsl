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
    float dist = 1./thing(world);

    /*dist += step( mod(position.x+0.241, 1./scale.x),0.002)*.3;
    dist += step( mod(position.x+0.24, 1./scale.x),0.002)*.1;
    dist += step( mod(position.x+0.239, 1./scale.x),0.002)*.1;*/

    dist = texture2D( tGrid, vUv*scale ).x;

    gl_FragColor = vec4( dist, dist, dist, .1 );
    
}

