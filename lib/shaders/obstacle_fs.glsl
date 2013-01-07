#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform sampler2D tGrid;
uniform sampler2D tDigits;
uniform vec2 scale; 
uniform vec2 points;
uniform vec3 diffuse;
uniform vec2 circlePosArray[10];
varying vec3 vWorldPosition;
uniform vec2 resolution;

float pixel = 1.0 / resolution.y;

void main(void) 
{
    vec3 lineColor = vec3(237.0/255.0,236.0/255.0,214.0/255.0);

    vec2 position = vWorldPosition.xz/vec2(resolution.x,resolution.y)+0.5;
    
    float color = texture2D( tGrid, position*scale ).x*0.5;

    float color2 = smoothstep( position.y,position.y+0.007,0.506);
    color2 -= smoothstep(position.y,position.y+0.007,0.499);
    
    /*if( position.y < 0.5 ) {
        float y = 0.4 - (position.y*0.9);

        float rows = floor(points.x/4.0);
        float offset = points.x-rows*4.0;

        color2 += texture2D(tDigits,vec2(position.x/4.0 + offset*0.25,  1.0-y/2.0 - rows*0.19 )).x;
    }
    else {
        float invY = (0.5-(1.0-(position.y*0.90)));

        float rows = floor(points.y/4.0);
        float offset = points.y-rows*4.0;

        color2 += texture2D(tDigits,vec2((1.0-position.x)/4.0 + offset*0.25,   1.0-invY/2.0 - rows*0.19  )).x;
    }*/

    vec3 gridColor = vec3(color, color, color);

    vec3 centerColor = vec3(color2)*lineColor;
    
    float ambientOcc = 1.0-min(1.0,abs(vWorldPosition.y+200.0)/40.0);

    gl_FragColor = vec4( diffuse*0.8-ambientOcc*0.1+centerColor+gridColor*lineColor*0.2 , 1.0);
    //gl_FragColor = vec4(vec3(ambientOcc),1.0);

}

