#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform float time;
uniform float noiseAmount;
uniform sampler2D tVideo;
uniform sampler2D tBroken;

float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }

void main(void) 
{

    float xs = floor(gl_FragCoord.x / 4.0);
    float ys = floor(gl_FragCoord.y / 4.0);

    float noise = rand(vec2(xs * time,ys * time))-0.5;
    //float c=noise(vUv,time);

    vec2 tempUv = vUv;
    tempUv.x += sin((vUv.y-0.5)*14.5*time)*0.01 + noise*noiseAmount*0.1;
    
    vec3 videoColor = texture2D(tVideo,vUv).rgb;
    float brokenColor = texture2D(tBroken,vUv).r;
    vec3 color = mix( videoColor, texture2D(tVideo,tempUv).rgb*1.5+noise,noiseAmount);
    vec3 finalColor = mix(color,vec3(noise*0.2),brokenColor);
    gl_FragColor=vec4(finalColor,1.0);
    
}

