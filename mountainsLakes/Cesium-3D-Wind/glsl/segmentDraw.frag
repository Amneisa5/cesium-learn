out vec4 outputColor;

void main() {
    // 降低粒子段初始不透明度
    outputColor = vec4(1.0, 1.0, 1.0, 0.6);
}