#ifdef GL_ES
precision mediump float;
#endif

#define PI 3.14159265359

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

vec3 colorA=vec3(.149,.141,.912);
vec3 colorB=vec3(1.,.833,.224);

float plot(vec2 st,float pct){
  return smoothstep(pct-.01,pct,st.y)-
  smoothstep(pct,pct+.01,st.y);
}

void main(){
  vec2 st = gl_FragCoord.xy/u_resolution.xy;
  vec3 color = vec3(0.0); // Default to black background
  
  // 判断是否在四个角的 0.1x0.1 小方格内
  
  // 左下角：st.x < 0.1 且 st.y < 0.1
  float isInBottomLeft = (1.0 - step(0.1, st.x)) * (1.0 - step(0.1, st.y));
  
  // 右下角：st.x > 0.9 且 st.y < 0.1
  float isInBottomRight = step(0.9, st.x) * (1.0 - step(0.1, st.y));
  
  // 左上角：st.x < 0.1 且 st.y > 0.9
  float isInTopLeft = (1.0 - step(0.1, st.x)) * step(0.9, st.y);
  
  // 右上角：st.x > 0.9 且 st.y > 0.9
  float isInTopRight = step(0.9, st.x) * step(0.9, st.y);
  
  // 合并所有四个角
  float isInCorner = isInBottomLeft + isInBottomRight + isInTopLeft + isInTopRight;
  
  // 在方格内显示白色，否则黑色
  color = vec3(isInCorner);
  
  gl_FragColor = vec4(color, 1.0);
}
