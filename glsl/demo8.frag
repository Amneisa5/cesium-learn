#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359
#define TWO_PI 6.28318530718

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

// Reference to
// http://thndl.com/square-shaped-shaders.html
float noise(vec2 st, in int N){
  float d = 0.0;
  // Angle and radius from the current pixel
  float a = atan(st.x,st.y)+PI; // 0 - 2pi
  float r = TWO_PI/float(N);  // 均分一个圆计算每个切片的角度大小

  // Shaping function that modulate the distance
  d = cos(floor(.5+a/r)*r-a)*length(st);

  return d;
}

void main(){
  vec2 st = gl_FragCoord.xy/u_resolution.xy;
   float aspect = u_resolution.x/u_resolution.y;
  if(aspect > 1.0){
    st.x *= aspect;
  }else {
    st.y /= aspect;
  }
  vec3 color = vec3(0.0);
  float d = 0.0;

  // Remap the space to -1. to 1.
  st = st *2.-1.;

  // Shaping function that modulate the distance
  d = noise(st, 5);

  color = vec3(1.0-smoothstep(.4,.41,d));
  // color = vec3(d);

  gl_FragColor = vec4(color,1.0);
}