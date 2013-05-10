#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform int bgr;
uniform float time;
uniform float noiseAmount;
uniform sampler2D tVideo;

float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }

void main(void)
{

    float xs = floor(gl_FragCoord.x / 4.0);
    float ys = floor(gl_FragCoord.y / 4.0);

    float noise = rand(vec2(xs * time,ys * time))-0.5;

    vec3 finalColor = mix(texture2D(tVideo, vUv).rgb,vec3(noise*0.2),noiseAmount);

    if( bgr == 1 ){
        gl_FragColor=vec4(finalColor.b,finalColor.g,finalColor.r,1.0);
    } else {
        gl_FragColor=vec4(finalColor.rgb,1.0);
    }
}

