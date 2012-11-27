#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform sampler2D tCamera;
uniform float time;
uniform float active;

float rect( vec2 p, vec2 b )
{
    vec2 v = abs(p) - b;
    float d = smoothstep(0.9,1.0,pow(length(max(v,0.0)),0.007));
    return (1.0-d);
}

float f(float x, float y) {

    float ny = y - sin(mod(time,7.0));
    
    return 2.0/sqrt(abs(ny));
}

float frac(float x) { return mod(x,1.0); }
float noise(vec2 x,float t) { return frac(sin(dot(x,vec2(1.38984*sin(t),1.13233*cos(t))))*653758.5453); }

void main(void) 
{

    if( active == 0.0 ) {
        float c=noise(vUv,time);
        c*=0.2+0.05*clamp(sin(vUv.y*3.141592+time*3.0)-0.4,0.0,1.0);
        gl_FragColor=vec4(vec3(c),1.0);
    }
    else {
        vec2 pos = vUv;
        pos.x = (1.0-pos.x);
        pos.y -= 0.05;
        vec3 color = texture2D(tCamera,pos).rgb; 

        float rect1 = rect(pos-vec2(0.5,0.2), vec2(0.2,0.10));
        float rect2 = rect(pos-vec2(0.5,0.2), vec2(0.194,0.093));
        
        float rectSum = rect1 - rect2;

        //cross
        rectSum += rect(pos-vec2(0.5,0.2), vec2(0.05,0.001));
        rectSum += rect(pos-vec2(0.5,0.2), vec2(0.001,0.05));

        //add rectangle in webcam
        color = color + vec3(rectSum)*0.4;

        //ambient scanlines
        float lines = mix(1.0, abs(sin(gl_FragCoord.y/1.1))/2.0, 0.3);
        vec3 saturatedColor = vec3((color.r+color.b+color.g)/3.0);

        float a = f(pos.x,1.0-pos.y);
        vec3 scanLines = vec3(sqrt(a)/10.0,  sqrt(a)/8.0,  sqrt(a)/5.0);

        vec3 scanMix = mix(color+scanLines*scanLines,saturatedColor*lines,1.0-rect2);
        //vec3 scanMix = mix(color+scanLines*scanLines,saturatedColor,1.0-rect2);

        gl_FragColor = vec4(scanMix,1.0);
    }

    
}

