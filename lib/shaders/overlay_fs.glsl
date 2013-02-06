#ifdef GL_ES
precision highp float;
#endif

varying vec2 vUv;
uniform vec2 resolution;
uniform sampler2D tTape;

void main(void) {
    vec2 p = gl_FragCoord.xy / resolution.xy;

    /*float darkness = 0.7;
    vec2 textureCoords = p - 0.5;
    float vignette = 1.0 - (dot(textureCoords, textureCoords) * darkness);

    vec3 vignetteColor = vec3(vignette);

    // add scanlines
    vignetteColor += vec3(0.1) * sin( p.y * resolution.y*3.14 );
*/
   /* float grid_height = (resolution.y+resolution.y*0.15)*0.33;

    //calculate the full grid
    float lines = step( mod(gl_FragCoord.y+3.0, grid_height),0.90)*0.6;
*/

    gl_FragColor = vec4(texture2D(tTape,vUv).rgb,1.0);


}