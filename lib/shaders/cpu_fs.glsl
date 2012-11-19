#ifdef GL_ES
precision mediump float;
#endif

uniform float time;
uniform vec2 mouse;
uniform vec2 resolution;

varying vec2 vUv;

float halfpi = asin(1.0);
float pixel = 1.0 / resolution.y;


void main( void ) {
    
    vec2 uPos = vUv;//( gl_FragCoord.xy / resolution.xy );//normalize wrt y axis
    
    uPos.x -=  mouse.x;
    
    float vertColor = 0.0;
    for( float i = 0.0; i < 4.0; ++i )
    {
        float t = time * (i + 0.4);
    
        uPos.x += sin( uPos.y + t ) * 0.2;
    
        float fTemp = abs(1.0 / uPos.x / 100.0);
        vertColor += fTemp;
    }
    
    vec4 color = vec4( vertColor, vertColor, vertColor * 2.5, 1.0 );
    gl_FragColor = color;

}