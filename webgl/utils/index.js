const Utils = {
  getCanvas (canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || canvas.nodeName !== "CANVAS") {
      console.error(`致命错误：找不到 Canvas "${canvasId}"`);
      return null;
    }
    return canvas;
  },

  getWebglContext (canvas) {
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) {
      console.error("未找到 WebGL 上下文。");
    }
    return gl;
  },
  compileShader (gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  },
  createAndFillBufferObject (gl, data) {
    var buffer_id;

    // Create a buffer object
    buffer_id = gl.createBuffer();
    if (!buffer_id) {
      out.displayError('Failed to create the buffer object for ' + model_name);
      return null;
    }

    // Make the buffer object the active buffer.
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer_id);

    // Upload the data for this buffer object to the GPU.
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    return buffer_id;
  }
};
