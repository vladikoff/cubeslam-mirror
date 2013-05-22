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

float rand( vec2 co ) {
    return fract(sin((co.x+co.y*1e3+0.001)*1e-3)*1.e5);
}

void main(void)
{

    float xs = floor(gl_FragCoord.x / 4.0);
    float ys = floor(gl_FragCoord.y / 4.0);
    float ofs = fract(time);
    float noise = rand(vec2(xs,ys)+vec2(0.0,0.9*ofs));

    vec2 tempUv = vUv;
    tempUv.x += sin(vUv.y*10.0+0.001)*0.01+cos(vUv.y*40.0+0.001)*0.005;
    tempUv.y = mix(vUv.y,fract(vUv.y-time*0.3),noiseAmount);

    vec3 videoOrg = texture2D(tVideo, vUv).rgb;

    vec2 offset = vec2(0.01*noiseAmount,0.0);
    float cr = texture2D(tVideo, tempUv + offset).r;
    float cga = texture2D(tVideo, tempUv).g;
    float cb = texture2D(tVideo, tempUv - offset).b;
    vec3 videoDistort = vec3(cr, cga, cb) + noise*.2;

    //rbg offset

    float brokenColor = texture2D(tBroken,vUv).r;
    vec3 color = mix( videoOrg, videoDistort,noiseAmount+0.1);
    vec3 finalColor = mix(color,vec3(noise*0.25),brokenColor);

    finalColor = mix( finalColor+noise*0.03, arenaColor, clamp((vWorldPosition.y+90.0)/-resolution.y,0.0,1.0));

    //scanlines
    finalColor += vec3(0.01) * sin( (vUv.y) * 360.0 );

    if( bgr == 1 ){
        gl_FragColor=vec4(finalColor.b,finalColor.g,finalColor.r,1.0);
    } else {
        gl_FragColor=vec4(finalColor.rgb,1.0);
    }
}

