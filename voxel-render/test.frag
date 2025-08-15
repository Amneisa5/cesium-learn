#ifdef GL_ES
precision mediump float;
#endif
#define PI 3.14
void main (){
  gl_FragColor = vec4(PI) / 10.0;
}
