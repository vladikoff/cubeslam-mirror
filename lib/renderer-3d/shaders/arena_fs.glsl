#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform sampler2D tGrid;
uniform vec3 arenaColor;
uniform vec2 scale;
varying vec3 vWorldPosition;
uniform vec2 resolution;
uniform float gridBrightness;

float pixel = 1.0 / resolution.y;

void main(void)
{
    //vec3 lineColor = vec3(237.0/255.0,236.0/255.0,214.0/255.0);

    vec2 position = vWorldPosition.xz/resolution.y+.5;;
    //float color = texture2D( tGrid, vUv*scale ).x;
    float color = texture2D( tGrid, vUv*scale ).x;

   // float color2 = smoothstep( vUv.y,vUv.y+0.007,0.5075);
   // color2 -= smoothstep(vUv.y,vUv.y+0.007,0.500);


    vec3 gridColor = vec3(color)*gridBrightness;
    //vec3 centerColor = vec3(color2)*lineColor;

    gl_FragColor = vec4( gridColor + arenaColor , step(gridColor.x,0.99) )*0.8;// + vec4( centerColor , color2)*0.8;

}

