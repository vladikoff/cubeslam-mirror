#ifdef GL_ES
precision mediump float;
#endif

varying vec2 vUv;
uniform sampler2D tCamera;
uniform float time;

float rect( vec2 p, vec2 b )
{
    vec2 v = abs(p) - b;
    float d = pow(length(max(v,0.0)),0.009);
    return (1.0-d);
}

float f(float x, float y) {

    float ny = y - sin(mod(time,7.0));

    float formula = 2.0;
    float formula_effects = formula/sqrt(ny);
    
    return formula_effects;
}


void main(void) 
{
    vec2 pos = vUv;
    pos.x = (1.0-pos.x);
    vec3 color = texture2D(tCamera,pos).rgb; 

    float rect1 = rect(pos-vec2(0.5,0.4), vec2(0.2,0.10));
    float rect2 = rect(pos-vec2(0.5,0.4), vec2(0.195,0.094));
    
    float rectSum = rect1 - rect2;

    color = color + vec3(rectSum)*0.4;

    float lines = mix(1.0, abs(sin(gl_FragCoord.y/1.4))/2.0, 0.3);
    vec3 saturatedColor = vec3((color.r+color.b+color.g)/3.0);

    float a = f(pos.x,pos.y);
    vec3 scanLines = vec3(sqrt(a)/10.0,  sqrt(a)/8.0,  sqrt(a)/5.0);


    vec3 scanMix = mix(color+scanLines*scanLines,saturatedColor*lines,1.0-rect2);

    gl_FragColor = vec4(scanMix,1.0);
}

