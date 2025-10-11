uniform sampler2D currentParticlesPosition; // (lon, lat, lev)
uniform sampler2D particlesSpeed; // (u, v, w, norm) Unit converted to degrees of longitude and latitude 

out vec4 fragColor;

void main() {
    // Cesium ComputeCommand 自动提供 gl_FragCoord，需要转换为纹理坐标
    vec2 v_textureCoordinates = gl_FragCoord.xy / czm_viewport.zw;
    
    // texture coordinate must be normalized
    vec3 lonLatLev = texture(currentParticlesPosition, v_textureCoordinates).rgb;
    vec3 speed = texture(particlesSpeed, v_textureCoordinates).rgb;
    vec3 nextParticle = lonLatLev + speed;

    fragColor = vec4(nextParticle, 0.0);
}