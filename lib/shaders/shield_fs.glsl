#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float uBrightness; 
uniform vec3 uColor;
uniform float uColumnValues[ 18 ];
uniform sampler2D tVideo;
uniform vec2 resolution;

float pixel = 1.0 / resolution.y;

float rect( vec2 p, vec2 b )
{
    vec2 v = abs(p) - b;
    float d = smoothstep(0.90,1.0,pow(length(max(v,0.0)),0.008));
    return (1.0-d);
}


void main( void ) {

    vec2 pos = vec2(vUv.x-1.0/36.0, vUv.y);
    float col = 0.0;

    for( float i = 0.0;i < 18.0;i++)
    {
        col += rect(pos-vec2(1.0/18.0*i,1.0), vec2(1.0/36.0,uColumnValues[int(i)])); 
    }

    float glassFactor = vUv.x*(1.0-vUv.y)*0.2 + 0.2;
    vec3 clr = uColor*col;
 
    vec3 camColor = texture2D(tVideo,vec2(1.0-vUv.x,vUv.y*0.7)).rgb;
    gl_FragColor = vec4( clr+camColor, (col*uBrightness + glassFactor)*(1.0-vUv.y));
    

}