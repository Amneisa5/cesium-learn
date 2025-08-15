const float IOR_AIR = 1.0;
const float IOR_WATER = 1.333;

const vec3 abovewaterColor = vec3(0.25, 1.0, 1.25);
const vec3 underwaterColor = vec3(0.4, 0.9, 1.0);

const float poolHeight = 1.0;

in vec3 v_positionEC;
in vec3 v_normalEC;
in vec2 v_st;
in vec3 v_eye;
in vec3 v_pos;

out vec4 fragColor;

uniform sampler2D water;
uniform vec3 light;
uniform sampler2D causticTex;
uniform bool underwater;

vec2 intersectCube(vec3 origin, vec3 ray, vec3 cubeMin, vec3 cubeMax) {
vec3 tMin = (cubeMin - origin) / ray;
vec3 tMax = (cubeMax - origin) / ray;
vec3 t1 = min(tMin, tMax);
vec3 t2 = max(tMin, tMax);
float tNear = max(max(t1.x, t1.y), t1.z);
float tFar = min(min(t2.x, t2.y), t2.z);
return vec2(tNear, tFar);
}


vec3 getWallColor(vec3 point) {
float scale = 0.5;
vec3 wallColor;
vec3 normal;

// Simple solid color for pool walls
wallColor = vec3(0.5, 0.5, 0.7); // Changed to solid color
if (abs(point.x) > 0.999) {
    normal = vec3(-sign(point.x), 0.0, 0.0);
} else if (abs(point.z) > 0.999) {
    normal = vec3(0.0, 0.0, -sign(point.z));
} else {
    normal = vec3(0.0, sign(point.y), 0.0);
}

scale /= length(point) + 0.1; /* pool ambient occlusion */

/* simple lighting - modified to avoid black surfaces */
float diffuse = max(0.3, dot(normal, light)); // Increased minimum light to 0.3 to avoid black
scale += diffuse * 0.5;

return wallColor * scale;
}


vec3 getSurfaceRayColor(vec3 origin, vec3 ray, vec3 waterColor) {
vec3 color;
vec2 t = intersectCube(origin, ray, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));

if (ray.y < 0.0) {
    // Ray going down - might hit bottom
    vec3 hit = origin + ray * t.y;
    color = getWallColor(hit);
} else {
    // Ray going up - might hit top or sides
    vec3 hit = origin + ray * t.y;
    color = getWallColor(hit);
}

// Added ambient light to prevent completely dark surfaces
color = max(color, vec3(0.15)); // Ensure minimum brightness level

return color * waterColor;
}

void main(){
// Simple water normal based on position
vec2 coord = v_pos.xz * 0.5 + 0.5;
vec3 normal = normalize(vec3(sin(coord.x * 10.0) * 0.1, 1.0, cos(coord.y * 10.0) * 0.1));

vec3 eyeVector = normalize(v_eye - v_pos);
vec3 reflectedRay = reflect(eyeVector, normal);
vec3 refractedRay = refract(eyeVector, normal, IOR_WATER / IOR_AIR);

// Handle total internal reflection
bool TIR = dot(eyeVector, normal) > 0.0 && refractedRay == vec3(0.0);

float fresnel = pow(1.0 - max(0.0, dot(-eyeVector, normal)), 3.0);
fresnel = mix(0.25, 1.0, fresnel);

vec3 reflectedColor = getSurfaceRayColor(v_pos, reflectedRay, abovewaterColor);
vec3 refractedColor;

if (TIR) {
    refractedColor = reflectedColor;
} else {
    refractedColor = getSurfaceRayColor(v_pos, refractedRay, underwaterColor);
}

vec3 color = mix(refractedColor, reflectedColor, fresnel);

// Water surface color - ensure minimum brightness
color = max(color, vec3(0.1));
fragColor = vec4(color, 0.1); 
}