#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;


void main(){
  vec2 st = gl_FragCoord.xy/u_resolution.xy;
  vec3 color = vec3(0.0); // Default to black background
  
  float pct = 0.0;
  float aspect = u_resolution.x / u_resolution.y;
  // 大于1.0时，x轴变长，y轴变短，说明x轴的一个像素点更短：1/1920，而y轴位：1/1080；
  if (aspect > 1.0) {
    st.x *= aspect;
  } else {
    st.y /= aspect;
  }
  // a. The DISTANCE from the pixel to the center
  pct = distance(st,vec2(0.5));

  pct = 1.0 - step(0.3, pct);

  color = vec3(pct);
  gl_FragColor = vec4(color, 1.0);
}
