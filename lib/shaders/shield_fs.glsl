#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float uBrightness; 
uniform vec3 uColor;
uniform float uColumnValues[ 18 ];

uniform vec2 resolution;
float pixel = 1.0 / resolution.y;

float rect( vec2 p, vec2 b, float smooth )
{
    vec2 v = abs(p) - b;

    float d = length(max(v,0.0));
    float powered = pow(d, smooth);

    return 1.0-powered;
}

void main( void ) {

    vec2 pos = vec2(vUv.x-1.0/36.0, vUv.y);
    float glow = 0.01;
    float col = 0.0;

    for( float i = 0.0;i < 18.0;i++)
    {
        col += rect(pos-vec2(1.0/18.0*i,1.0), vec2(1.0/36.0,uColumnValues[int(i)]), glow); 
    }

    float glassFactor = vUv.x*(1.0-vUv.y)*0.2;
    vec3 clr = uColor*col;
 
    gl_FragColor = vec4( clr+uColor, (col*uBrightness + glassFactor)*(1.0-vUv.y));

}