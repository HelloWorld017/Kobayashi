#version 300 es

precision highp float;

layout(location = 0) in vec2 planeCoord;
layout(location = 1) in vec2 textureCoordIn;

out vec2 textureCoord;

void main() {
    gl_Position = vec4(planeCoord, 0, 1);
    textureCoord = textureCoordIn;
}
