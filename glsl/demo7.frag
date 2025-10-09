// Author @patriciogv - 2015
// http://patriciogonzalezvivo.com

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float plot(vec2 st,float pct){
  return smoothstep(pct-.01,pct,st.y)-
  smoothstep(pct,pct+.01,st.y);
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
  
  // 创建一个高度场 - 使用组合的sin和cos函数模拟地形
  vec2 pos = st * 6.0; // 缩放坐标
  float height = sin(pos.x) * cos(pos.y) * 0.5 + 0.5; // 归一化到[0,1]
  
  // 添加更多细节
  height += sin(pos.x * 2.0 + u_time * 0.5) * 0.1;
  height += cos(pos.y * 2.0 - u_time * 0.3) * 0.1;
  
  // 背景渐变色表示高度
  color = vec3(height * 0.3, height * 0.5, height * 0.8);
  
  // 绘制等高线 - 每隔0.1绘制一条线
  const float numLevels = 10.0; // 等高线数量
  for(float i = 0.0; i < numLevels; i++){
    float level = i / numLevels;
    float line = plot(vec2(st.x, height), level);
    color = mix(color, vec3(1.0), line); // 等高线为白色
  }
  
  gl_FragColor = vec4(color, 1.0);
}
