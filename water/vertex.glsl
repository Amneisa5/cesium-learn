in vec3 position;
in vec3 normal;
in vec2 st;

out vec3 v_positionEC;
out vec3 v_normalEC;
out vec2 v_st;
out vec3 v_eye;
out vec3 v_pos;

void main()
{
  v_positionEC = (czm_modelView * vec4(position, 1.0)).xyz;       // position in eye coordinates
  v_normalEC = czm_normal * normal;                               // normal in eye coordinates
  v_st = st;

  vec4 pos = czm_modelViewProjection * vec4(position, 1.0);
  // Calculate eye position in model space for proper reflection/refraction
  v_eye = -(czm_inverseModelViewProjection * vec4(pos.xy, -1.0, 1.0)).xyz;
  v_pos = position;

  gl_Position = pos;
}