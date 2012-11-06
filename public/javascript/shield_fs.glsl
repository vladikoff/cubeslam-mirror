#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float uBrightness; 
uniform vec3 uColor;
uniform float uColumnValues[ 18 ];

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

    vec2 pos = vec2(vUv.x-1.0/36.0, vUv.y);
    float glow = 0.01;
    float col = 0.0;

    for( float i = 0.0;i < 18.0;i++)
    {
        col += rect(pos-vec2(1.0/18.0*i,1.0), vec2(1.0/36.0,uColumnValues[int(i)]), glow)*1.0; 
    }

    float glassFactor = vUv.x*(1.0-vUv.y);
    vec3 clr = uColor*col + uColor*glassFactor;
 
    gl_FragColor = vec4( clr, (col*0.8 + glassFactor)*((1.0-vUv.y)));

}