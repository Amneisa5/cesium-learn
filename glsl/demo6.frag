#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

void main(){
  vec2 st = gl_FragCoord.xy/u_resolution.xy;
   float aspect = u_resolution.x / u_resolution.y;
  // 大于1.0时，x轴变长，y轴变短，说明x轴的一个像素点更短：1/1920，而y轴位：1/1080；
  if (aspect > 1.0) {
    st.x *= aspect;
  } else {
    st.y /= aspect;
  }
  vec3 color = vec3(0.0);
  float d = 0.0;

  // Remap the space to -1. to 1.
  st = st *2.-1.;

  // Make the distance field
  d = length( abs(st)-.3 );
  d = length( min(abs(st)-.3,0.) );
  d = length( max(abs(st)-.3,0.) );

  // 取小数部分
  gl_FragColor = vec4(vec3(fract(d*10.0)),1.0);

  // Drawing with the distance field
  // gl_FragColor = vec4(vec3( step(.3,d) ),1.0);
  // gl_FragColor = vec4(vec3( step(.3,d) * step(d,.4)),1.0);
  // gl_FragColor = vec4(vec3( smoothstep(.3,.4,d)* smoothstep(.6,.5,d)) ,1.0);
}