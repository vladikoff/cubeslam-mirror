#ifdef GL_ES
precision mediump float;
#endif

varying vec3 vWorldPosition;
varying vec2 vUv;
uniform vec3 arenaColor;
uniform float time;
uniform float noiseAmount;
uniform int bgr;
uniform sampler2D tVideo;
uniform sampler2D tBroken;
uniform vec2 resolution;

void main(void)
{

    vec2 tempUv = vUv;

    tempUv.y = mix(vUv.y,fract(vUv.y-time*0.3),noiseAmount);

    vec3 videoOrg = texture2D(tVideo, vUv).rgb;
    vec3 videoDistort = texture2D(tVideo, tempUv).rgb;

    float brokenColor = texture2D(tBroken,vUv).r;
    vec3 color = mix( videoOrg, videoDistort,noiseAmount);
    vec3 finalColor = mix(color,vec3(0.0,0.0,0.0),brokenColor);

    finalColor = mix( finalColor, arenaColor, clamp((vWorldPosition.y+90.0)/-resolution.y,0.0,1.0));

    //scanlines
    //finalColor += vec3(0.01) * sin( (vUv.y) * 360.0 );

    if( bgr == 1 ){
        gl_FragColor=vec4(finalColor.b,finalColor.g,finalColor.r,1.0);
    } else {
        gl_FragColor=vec4(finalColor.rgb,1.0);
    }

}

