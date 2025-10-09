// Author @patriciogv - 2015

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform float u_time;

float circle(in vec2 _st, in float _radius){
    vec2 l = _st-vec2(0.5);
    return 1.-smoothstep(_radius-(_radius*0.01),
                         _radius+(_radius*0.01),
                         dot(l,l)*4.0);
}

vec2 _scale(vec2 st, float scale){
    st *= scale;
    st = fract(st / vec2(u_resolution.x / u_resolution.y, 1.0));
    return st;
}

void main() {
	vec2 st = gl_FragCoord.xy/u_resolution;
  vec3 color = vec3(0.0);
  st.x *= u_resolution.x / u_resolution.y;
  // 放大三倍之后每项再重新回到0-1之间
  st = _scale(st,4.0);
  // Now we have 9 spaces that go from 0-1

  color = vec3(st,0.0);
  // color = vec3(circle(st,0.5));

	gl_FragColor = vec4(color,1.0);
}