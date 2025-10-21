uniform sampler2D segmentsColorTexture;
uniform sampler2D segmentsDepthTexture;

uniform sampler2D currentTrailsColor;
uniform sampler2D trailsDepthTexture;

uniform float fadeOpacity;

in vec2 textureCoordinate;
out vec4 outputColor;

void main() {
    vec4 pointsColor = texture(segmentsColorTexture, textureCoordinate);
    vec4 trailsColor = texture(currentTrailsColor, textureCoordinate);

    trailsColor = floor(fadeOpacity * 255.0 * trailsColor) / 255.0; // make sure the trailsColor will be strictly decreased

    // 合成颜色，确保纯白色输出
    vec4 color = pointsColor + trailsColor;
    // 强制设置为纯白色，保持透明度
    color.rgb = vec3(1.0, 1.0, 1.0);
    color.a = min(color.a, 1.0); // 确保透明度不超过1.0
    outputColor = color;
}