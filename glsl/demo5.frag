#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float circle(in vec2 _st, in float _radius){
    vec2 dist = _st-vec2(0.5);
	return 1.-smoothstep(_radius-(_radius*0.01),
                         _radius+(_radius*0.01),
                         dot(dist,dist)*4.0);
  // return 1.0 - step(_radius, dot(dist,dist)*4.0);
}

void main(){
	vec2 st = gl_FragCoord.xy/u_resolution.xy;
  float aspect = u_resolution.x / u_resolution.y;
  // 大于1.0时，x轴变长，y轴变短，说明x轴的一个像素点更短：1/1920，而y轴位：1/1080；
  if (aspect > 1.0) {
    st.x *= aspect;
  } else {
    st.y /= aspect;
  }
	vec3 color = vec3(circle(st,0.8));

	gl_FragColor = vec4( color, 1.0 );
}