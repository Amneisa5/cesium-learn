#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
    const vec4 red = vec4(1.0, 1.0, 1.0, 1.0); // 红色，透明度为1
    fragColor = red;
}