#ifdef GL_ES
precision mediump float;
#endif

uniform sampler2D tGrid;
uniform vec2 scale;
uniform vec3 diffuse;
varying vec3 vWorldPosition;
uniform vec2 resolution;
uniform float gridBrightness;
uniform float centerLineAmount;

float pixel = 1.0 / resolution.y;

void main(void)
{
    vec3 lineColor = vec3(237.0/255.0,236.0/255.0,214.0/255.0);

    vec2 position = vWorldPosition.xz/vec2(resolution.x,resolution.y)+0.5;

    //float color = texture2D( tGrid, position*scale ).x;
    float color = texture2D( tGrid, position*scale ).x*0.5;

    float color2 = smoothstep( position.y,position.y+0.007,0.506);
    color2 -= smoothstep(position.y,position.y+0.007,0.499);

    vec3 gridColor = vec3(color, color, color);
    vec3 centerColor = vec3(color2)*lineColor;

    float ambientOcc = 1.0-min(1.0,abs(vWorldPosition.y+200.0)/40.0);

   gl_FragColor = vec4( diffuse*0.8-ambientOcc*0.1+centerColor*centerLineAmount+gridColor*lineColor*0.2 , 1.0);

}
