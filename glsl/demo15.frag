// Author @patriciogv ( patriciogonzalezvivo.com ) - 2015

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

float _aspect(){
  return u_resolution.x / u_resolution.y;
}

vec2 moiveCircle(vec2 _st, float _scale, float _speed){
  // 先缩放设置的倍数
  _st *= _scale;
  // 再根据时间进行移动
  float time = u_time * _speed;
  if(fract(time) > 0.5){
    // 水平移动
    // 间隔移动
    if(fract(_st.y * 0.5) >0.5){
      _st.x += fract(time) * 2.0;
    }else{
      _st.x -= fract(time) * 2.0;
    }
  }else {
    if(fract(_st.x * 0.5) >0.5){
      _st.y += fract(time) * 2.0;
    }else{
      _st.y -= fract(time) * 2.0;
    }
  }
  return fract(_st);
}

float circle(vec2 _st, float _radius){
    vec2 pos = vec2(0.5)-_st;
    return smoothstep(1.0-_radius,1.0-_radius+_radius*0.02,1.-dot(pos,pos)*3.14);
}

void main(void){
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    st.x *= _aspect();
    vec3 color = vec3(0.0);

    st = moiveCircle(st,10.,0.5);

    color = vec3( 1.0-circle(st, 0.3 ) );

    gl_FragColor = vec4(color,1.0);
}
