uniform sampler2D trailsColorTexture;
uniform sampler2D trailsDepthTexture;

in vec2 textureCoordinate;
out vec4 outputColor;

void main() {
    vec4 trailsColor = texture(trailsColorTexture, textureCoordinate);
    // 直接输出粒子颜色（不与地球深度比较），确保任意角度可见
    outputColor = trailsColor;
}