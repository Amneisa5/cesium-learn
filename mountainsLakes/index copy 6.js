Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMDg0MzI2Ni0wMGI3LTQyOTYtOGM1Zi1iMTE4OTkxMTgyYzciLCJpZCI6MTc1MDE3LCJpYXQiOjE3NTQ5ODAxMTd9.Id_Wy_2_BUC537hz_sZlLTVbQ4i93qGgcR-Ro7X7qXA'
let textureData;
class CustomPrimitive {
  commandType;
  geometry;
  attributeLocations;
  primitiveType;
  uniformMap;
  vertexShaderSource;
  fragmentShaderSource;
  rawRenderState;
  framebuffer;
  outputTexture;
  autoClear;
  preExecute;
  modelMatrix;
  show;
  commandToExecute;
  clearCommand;

  constructor(options) {
    this.commandType = options.commandType;

    this.geometry = options.geometry;
    this.attributeLocations = options.attributeLocations;
    this.primitiveType = options.primitiveType;

    this.uniformMap = options.uniformMap;

    this.vertexShaderSource = options.vertexShaderSource;
    this.fragmentShaderSource = options.fragmentShaderSource;

    this.rawRenderState = options.rawRenderState;
    this.framebuffer = options.framebuffer;

    this.outputTexture = options.outputTexture;

    this.autoClear = Cesium.defaultValue(options.autoClear, false);
    this.preExecute = options.preExecute;

    this.modelMatrix = Cesium.defaultValue(
      options.modelMatrix,
      Cesium.Matrix4.IDENTITY,
    );
    this.show = true;
    this.commandToExecute = undefined;
    this.clearCommand = undefined;
    if (this.autoClear) {
      this.clearCommand = new Cesium.ClearCommand({
        color: new Cesium.Color(0.0, 0.0, 0.0, 0.0),
        depth: 1.0,
        framebuffer: this.framebuffer,
        pass: Cesium.Pass.OPAQUE,
      });
    }
  }

  createCommand (context) {
    switch (this.commandType) {
      case 'Draw': {
        let vertexArray = Cesium.VertexArray.fromGeometry({
          context: context,
          geometry: this.geometry,
          attributeLocations: this.attributeLocations,
          bufferUsage: Cesium.BufferUsage.STATIC_DRAW,
        });

        let shaderProgram = Cesium.ShaderProgram.fromCache({
          context: context,
          attributeLocations: this.attributeLocations,
          vertexShaderSource: this.vertexShaderSource,
          fragmentShaderSource: this.fragmentShaderSource,
        });

        let renderState = Cesium.RenderState.fromCache(this.rawRenderState);
        return new Cesium.DrawCommand({
          owner: this,
          vertexArray: vertexArray,
          primitiveType: this.primitiveType,
          uniformMap: this.uniformMap,
          modelMatrix: this.modelMatrix,
          shaderProgram: shaderProgram,
          framebuffer: this.framebuffer,
          renderState: renderState,
          pass: Cesium.Pass.OPAQUE,
        });
      }
      case 'Compute': {
        return new Cesium.ComputeCommand({
          owner: this,
          fragmentShaderSource: this.fragmentShaderSource,
          uniformMap: this.uniformMap,
          outputTexture: this.outputTexture,
          persists: true,
        });
      }
    }
  }

  setGeometry (context, geometry) {
    this.geometry = geometry;
    let vertexArray = Cesium.VertexArray.fromGeometry({
      context: context,
      geometry: this.geometry,
      attributeLocations: this.attributeLocations,
      bufferUsage: Cesium.BufferUsage.STATIC_DRAW,
    });
    this.commandToExecute.vertexArray = vertexArray;
  }
  update (frameState) {
    if (!this.show) {
      return;
    }

    if (!Cesium.defined(this.commandToExecute)) {
      this.commandToExecute = this.createCommand(frameState.context);
    }

    if (Cesium.defined(this.preExecute)) {
      this.preExecute();
    }

    if (Cesium.defined(this.clearCommand)) {
      frameState.commandList.push(this.clearCommand);
    }
    frameState.commandList.push(this.commandToExecute);
  }
  isDestroyed () {
    return false;
  }
  destroy () {
    if (Cesium.defined(this.commandToExecute)) {
      this.commandToExecute.shaderProgram =
        this.commandToExecute.shaderProgram &&
        this.commandToExecute.shaderProgram.destroy();
    }
    return Cesium.destroyObject(this);
  }
}
class RenderUtil {
  constructor() { }

  static loadText (filePath) {
    let request = new XMLHttpRequest();
    request.open('GET', filePath, false);
    request.send();
    return request.responseText;
  }

  static getFullscreenQuad () {
    let fullscreenQuad = new Cesium.Geometry({
      attributes: new Cesium.GeometryAttributes({
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT || 5126,
          componentsPerAttribute: 3,
          // v3----v2
          // |   |
          // |   |
          // v0----v1
          values: new Float32Array([
            -1,
            -1,
            0, ,// v0
            1,
            -1,
            0,// v1
            1,
            1,
            0,// v2
            -1,
            1,
            0,// v3
          ]),
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT || 5126,
          componentsPerAttribute: 2,
          values: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        }),
      }),
      indices: new Uint32Array([3, 2, 0, 0, 2, 1]),
    });
    return fullscreenQuad;
  }

  static createTexture (options) {
    if (Cesium.defined(options.arrayBufferView)) {
      let source = {};
      source.arrayBufferView = options.arrayBufferView;
      source.width = options.width;
      source.height = options.height;
      options.source = source;
    }

    let texture = new Cesium.Texture(options);
    return texture;
  }

  static createFramebuffer (context, colorTexture, depthTexture) {
    let framebuffer = new Cesium.Framebuffer({
      context: context,
      colorTextures: [colorTexture],
      depthTexture: depthTexture,
    });
    return framebuffer;
  }

  static createRawRenderState (options) {
    let translucent = true;
    let closed = false;
    let existing = {
      viewport: options.viewport,
      depthTest: options.depthTest,
      depthMask: options.depthMask,
      blending: options.blending,
    };

    let rawRenderState = Cesium.Appearance.getDefaultRenderState(
      translucent,
      closed,
      existing,
    );
    return rawRenderState;
  }
}
const generateModelMatrix = (position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) => {
  if (!(position instanceof Cesium.Cartesian3) && (!Array.isArray(position) || position.length !== 3)) {
    throw new Error('position 参数必须是 Cesium.Cartesian3 或长度为3的数组');
  }
  const rotationX = Cesium.Matrix4.fromRotationTranslation(
    Cesium.Matrix3.fromRotationX(Cesium.Math.toRadians(rotation[0])),
  );

  const rotationY = Cesium.Matrix4.fromRotationTranslation(
    Cesium.Matrix3.fromRotationY(Cesium.Math.toRadians(rotation[1])),
  );

  const rotationZ = Cesium.Matrix4.fromRotationTranslation(
    Cesium.Matrix3.fromRotationZ(Cesium.Math.toRadians(rotation[2])),
  );
  // 确保 position 是 Cesium.Cartesian3 类型
  let cartesianPosition;
  if (position instanceof Cesium.Cartesian3) {
    cartesianPosition = position;
  } else if (Array.isArray(position) && position.length === 3) {
    cartesianPosition = Cesium.Cartesian3.fromDegrees(
      position[0],
      position[1],
      position[2],
    );
  } else {
    thrownewError('position 参数必须是 Cesium.Cartesian3 或长度为3的数组');
  }
  const enuMatrix =
    Cesium.Transforms.eastNorthUpToFixedFrame(cartesianPosition);
  Cesium.Matrix4.multiply(enuMatrix, rotationX, enuMatrix);
  Cesium.Matrix4.multiply(enuMatrix, rotationY, enuMatrix);
  Cesium.Matrix4.multiply(enuMatrix, rotationZ, enuMatrix);
  const scaleMatrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(...scale));
  const modelMatrix = Cesium.Matrix4.multiply(
    enuMatrix,
    scaleMatrix,
    new Cesium.Matrix4(),
  );

  return modelMatrix;
};

// ========== 简化的地形渲染 Shader 常量 ==========
const getCommand = (width, height) => `
  const int terrainWidth = ${width};
  const int terrainHeight = ${height};
  
  // 地形渲染参数
  const vec3 backgroundColor = vec3(0.05, 0.1, 0.2);
  const vec3 lightDirection = normalize(vec3(0.3, 0.8, 0.5));
  const float terrainScale = 0.2; // 地形高度缩放因子
  const float heightOffset = 0.1; // 地形高度偏移

  mat2 rot(in float ang){ return mat2(cos(ang), -sin(ang), sin(ang), cos(ang)); }

  // Box intersection by IQ
  vec2 hitBox(vec3 orig, vec3 dir) {
    const vec3 box_min = vec3(-0.5);
    const vec3 box_max = vec3(0.5);
    vec3 inv_dir = 1.0 / dir;
    vec3 tmin_tmp = (box_min - orig) * inv_dir;
    vec3 tmax_tmp = (box_max - orig) * inv_dir;
    vec3 tmin = min(tmin_tmp, tmax_tmp);
    vec3 tmax = max(tmin_tmp, tmax_tmp);
    float t0 = max(tmin.x, max(tmin.y, tmin.z));
    float t1 = min(tmax.x, min(tmax.y, tmax.z));
    return vec2(t0, t1);
  }

  vec3 applyFog(in vec3 rgb, vec3 fogColor, in float distance){
    float fogAmount = exp(-distance * 0.1);
    return mix(fogColor, rgb, fogAmount);
  }
`;
// ========== 简化的地形高度缓冲区 ==========
const TerrainBuffer = `
  uniform sampler2D heightMap;
  uniform float iTime;
  uniform int iFrame;

  void main() {
    if(gl_FragCoord.x > float(terrainWidth) || gl_FragCoord.y > float(terrainHeight))
      discard;

    ivec2 p = ivec2(gl_FragCoord.xy);
    float terrainElevation = texelFetch(heightMap, p, 0).r;
    
    // 只输出地形高度，不包含水体信息
    out_FragColor = vec4(terrainElevation, 0.0, 0.0, 1.0);
  }
`;

// ========== 移除水体相关的缓冲区，只保留地形渲染 ==========

const getRenderShader = (width, height) => `
  uniform sampler2D terrainTexture;
  uniform vec2 iResolution;
  uniform float iTime;
  uniform int iFrame;

  uniform float minHeight;
  uniform float maxHeight;
  in vec3 v_position;
  in vec2 v_st;
  out vec4 fragColor;

  void main() {
    // 获取当前片元的高程值（R通道）
    // 与几何UV保持一致（不再额外翻转），避免重复翻转导致取样落到边界
    vec2 uv = v_st;
    
    // UV坐标范围检查（已确认正常）
    
    vec4 texColor = texture(terrainTexture, uv);
    float h = texColor.r; // 从RGBA纹理的R通道获取高度

    // 将高度归一化到 [0,1] (h是0-255范围，需要转换回原始高度)
    float rawHeight = h * 255.0; // 转换回0-255范围
    float nh = clamp((rawHeight - minHeight) / max(1e-6, (maxHeight - minHeight)), 0.0, 1.0);

    // 基于高度的颜色映射
    vec3 baseColor = vec3(0.0);

    // 用程序化渐变（沙滩-草地-岩石-积雪）
    vec3 c1 = vec3(0.90, 0.85, 0.70); // 低海拔沙色
    vec3 c2 = vec3(0.20, 0.55, 0.25); // 草地绿
    vec3 c3 = vec3(0.45, 0.40, 0.35); // 岩石棕
    vec3 c4 = vec3(0.95, 0.95, 0.98); // 积雪白
    vec3 ramp = mix(c1, c2, smoothstep(0.05, 0.35, nh));
    ramp = mix(ramp, c3, smoothstep(0.35, 0.70, nh));
    ramp = mix(ramp, c4, smoothstep(0.75, 0.92, nh));

    vec3 color = mix(ramp, baseColor, 0.4); // 结合贴图与程序化调色

    // 简单光照：抬高环境光避免过暗
    vec3 normal = vec3(0.0, 1.0, 0.0);
    vec3 lightDirection = vec3(0.3, 0.8, 0.5);
    float ambient = 0.45;
    float diffuse = max(dot(normal, lightDirection), 0.15);
    color *= (ambient + diffuse);

    // 恢复完整的颜色映射
    fragColor = vec4(color, 1.0);
    
    // fragColor = vec4(nh, nh, nh, 1.0);
    // fragColor = vec4(h, h, h, 1.0);
    // fragColor = vec4(v_st, 0.0, 1.0);
  }
`;

class TerrainRenderer {
  constructor(viewer, width, height, heightData) {
    this._viewer = viewer;
    this._width = width;
    this._height = height;
    this._resolution = new Cesium.Cartesian2(width, height);

    // 正确的高程数据归一化（避免内存溢出）
    let minH = heightData[0];
    let maxH = heightData[0];

    // 循环遍历找到最小值和最大值
    for (let i = 1; i < heightData.length; i++) {
      if (heightData[i] < minH) minH = heightData[i];
      if (heightData[i] > maxH) maxH = heightData[i];
    }

    console.log("原始高程范围:", minH, "到", maxH, "米");
    console.log("数据点数量:", heightData.length);
    console.log("纹理尺寸:", this._width, "x", this._height);
    console.log("网格尺寸:", Math.min(this._width, 256), "x", Math.min(this._height, 256));
    this._minHeight = minH;
    this._maxHeight = maxH;

    this._heightData = heightData;
    this.initTerrainRenderer();
  }

  createTerrainGeometry () {
    const width = this._width;
    const height = this._height;
    const heightData = this._heightData;

    // 创建网格参数（子采样到不超过 256x256，避免索引溢出和瓦片重复）
    const gridWidth = Math.min(width, 256);
    const gridHeight = Math.min(height, 256);

    const vertices = [];
    const uvs = [];
    const indices = [];

    const lonMin = 120, lonMax = 123.5;
    const latMin = 30, latMax = 32.5;

    // 顶点坐标 + UV（从原始数据子采样）
    for (let gy = 0; gy < gridHeight; gy++) {
      const srcY = Math.round((gy / (gridHeight - 1)) * (height - 1));
      for (let gx = 0; gx < gridWidth; gx++) {
        const srcX = Math.round((gx / (gridWidth - 1)) * (width - 1));
        const srcIndex = srcY * width + srcX;

        const lon = lonMin + (srcX / (width - 1)) * (lonMax - lonMin);
        const lat = latMax - (srcY / (height - 1)) * (latMax - latMin);
        const h = heightData[srcIndex] * 50.0;

        const cartesian = Cesium.Cartesian3.fromDegrees(lon, lat, h);
        vertices.push(cartesian.x, cartesian.y, cartesian.z);

        // UV 覆盖整个几何
        uvs.push(gx / (gridWidth - 1), 1.0 - (gy / (gridHeight - 1)));
      }
    }

    // 三角形索引（基于子采样网格）
    for (let gy = 0; gy < gridHeight - 1; gy++) {
      for (let gx = 0; gx < gridWidth - 1; gx++) {
        const a = gy * gridWidth + gx;
        const b = a + 1;
        const c = (gy + 1) * gridWidth + gx;
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    // 使用双精度计算后，转换为以中心为原点的局部Float32，避免GPU双精度限制与精度问题
    const bsAll = Cesium.BoundingSphere.fromVertices(new Float64Array(vertices));
    const center = bsAll.center;

    const localPositions = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i += 3) {
      localPositions[i] = vertices[i] - center.x;
      localPositions[i + 1] = vertices[i + 1] - center.y;
      localPositions[i + 2] = vertices[i + 2] - center.z;
    }

    // 缓存模型矩阵（平移到真实世界中心）
    this._terrainModelMatrix = Cesium.Matrix4.fromTranslation(center);

    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT || 5126,
          componentsPerAttribute: 3,
          values: localPositions,
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT || 5126,
          componentsPerAttribute: 2,
          values: new Float32Array(uvs),
        })
      },
      indices: gridWidth * gridHeight <= 65535 ? new Uint16Array(indices) : new Uint32Array(indices),
      primitiveType: Cesium.PrimitiveType.TRIANGLES || 4,
    });

    // 为避免索引/UV越界导致的奇异块，开启显式背面剔除与深度测试
    geometry.boundingSphere = bsAll;

    const boundingSphere = Cesium.BoundingSphere.fromVertices(new Float64Array(vertices));
    const primitiveCenter = boundingSphere.center;

    // 定义相机偏移（可以随意调节旋转半径和高度）
    const offset = new Cesium.Cartesian3(0.0, -boundingSphere.radius * 3.0, boundingSphere.radius * 2.0);

    viewer.camera.lookAt(primitiveCenter, offset);

    return geometry;
  }

  initTerrainRenderer () {
    const ctx = this._viewer.scene.context;
    console.log(this._heightData)
    // 创建地形高度纹理（Ping-Pong：A 为读，B 为写）
    console.log("创建纹理，尺寸:", this._width, "x", this._height, "数据长度:", this._heightData.length);
    // 将高度数据转换为RGBA格式，使用原始高度值范围
    const rgbaData = new Uint8Array(this._width * this._height * 4);
    console.log("高度范围:", this._minHeight, "到", this._maxHeight);
    console.log("高度差值:", this._maxHeight - this._minHeight);

    // 检查一些样本高度值
    const sampleIndices = [0, Math.floor(this._heightData.length / 4), Math.floor(this._heightData.length / 2), Math.floor(this._heightData.length * 3 / 4), this._heightData.length - 1];
    console.log("样本高度值:");
    sampleIndices.forEach(i => {
      if (i < this._heightData.length) {
        console.log(`  索引${i}: ${this._heightData[i]}`);
      }
    });

    for (let i = 0; i < this._heightData.length; i++) {
      // 使用原始高度值，不进行归一化
      const rawValue = this._heightData[i];
      const value = Math.max(0, Math.min(255, (rawValue - this._minHeight) / (this._maxHeight - this._minHeight) * 255));
      rgbaData[i * 4] = value;     // R
      rgbaData[i * 4 + 1] = value; // G
      rgbaData[i * 4 + 2] = value; // B
      rgbaData[i * 4 + 3] = 255;   // A
    }

    const heightTextureA = new Cesium.Texture({
      context: ctx,
      width: this._width,
      height: this._height,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.UNSIGNED_BYTE,
      source: { arrayBufferView: rgbaData },
      sampler: new Cesium.Sampler({
        wrapS: Cesium.TextureWrap.CLAMP_TO_EDGE,
        wrapT: Cesium.TextureWrap.CLAMP_TO_EDGE,
        minificationFilter: Cesium.TextureMinificationFilter.NEAREST,
        magnificationFilter: Cesium.TextureMagnificationFilter.NEAREST,
      }),
    });
    const heightTextureB = new Cesium.Texture({
      context: ctx,
      width: this._width,
      height: this._height,
      pixelFormat: Cesium.PixelFormat.R32F,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      // 初始化为同样的高程数据，避免首帧空白
      source: { arrayBufferView: this._heightData },
      sampler: new Cesium.Sampler({
        wrapS: Cesium.TextureWrap.CLAMP_TO_EDGE,
        wrapT: Cesium.TextureWrap.CLAMP_TO_EDGE,
        minificationFilter: Cesium.TextureMinificationFilter.NEAREST,
        magnificationFilter: Cesium.TextureMagnificationFilter.NEAREST,
      }),
    });

    // Ping-Pong 读写引用
    const readTex = { tex: heightTextureA };
    const writeTex = { tex: heightTextureB };

    const Command = getCommand(this._width, this._height);
    const quadGeometry = RenderUtil.getFullscreenQuad();

    let time = 0, frame = 0;
    this._viewer.scene.postRender.addEventListener(() => {
      time = performance.now() / 1000;
      frame++;
    });

    // 计算缓冲（Ping-Pong）：每帧把高度从 readTex 写入 writeTex，再交换
    const terrainBuffer = new CustomPrimitive({
      commandType: 'Compute',
      uniformMap: {
        iTime: () => time,
        iFrame: () => frame,
        heightMap: () => readTex.tex,
      },
      fragmentShaderSource: new Cesium.ShaderSource({ sources: [Command, TerrainBuffer] }),
      geometry: quadGeometry,
      outputTexture: writeTex.tex,
      preExecute: () => {
        // 每帧写入 writeTex（不交换），绘制阶段直接采样 writeTex
        terrainBuffer.commandToExecute.outputTexture = writeTex.tex;
      }
    });

    // 创建地形网格几何体 - 使用简单的单位矩阵，让地形平躺
    const modelMatrix = Cesium.Matrix4.IDENTITY;

    // 创建地形网格几何体
    const geometry = this.createTerrainGeometry();
    const attributelocations = Cesium.GeometryPipeline.createAttributeLocations(geometry);
    const exaggeration = 5000.0; // 高程夸张系数
    const terrainCommand = new CustomPrimitive({
      commandType: 'Draw',
      uniformMap: {
        iTime: () => time,
        iFrame: () => frame,
        iResolution: () => this._resolution,
        // 直接采样原始高度纹理A，绕过 ping-pong 以验证纹理问题
        terrainTexture: () => heightTextureA,
        heightScale: () => exaggeration,
        minHeight: () => this._minHeight,
        maxHeight: () => this._maxHeight,
      },
      geometry: geometry,
      modelMatrix: this._terrainModelMatrix || modelMatrix,
      attributeLocations: attributelocations,
      vertexShaderSource: new Cesium.ShaderSource({
        sources: [`
              in vec3 position;
              in vec2 st;
              out vec3 v_position;
              out vec2 v_st;
              void main() {
                v_position = position;
                v_st = st;
                gl_Position = czm_modelViewProjection * vec4(position, 1.0);
              }
            `]
      }),
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [Command + getRenderShader(this._width, this._height)]
      }),
    });

    // 添加到场景：先计算，再绘制
    // 暂时移除计算写入，直接使用原始高度纹理以排查四块采样问题
    // this._viewer.scene.primitives.add(terrainBuffer);
    this._viewer.scene.primitives.add(terrainCommand);

    // 返回terrainCommand和高度纹理以便外部使用
    this._terrainCommand = terrainCommand;
    this._heightTexture = heightTextureA;
  }
};

// 流体模拟系统 - 基于old.js的复杂水体效果
class FluidSystem {
  constructor(viewer, width, height, terrainHeightTexture) {
    this._viewer = viewer;
    this._width = width;
    this._height = height;
    this._terrainHeightTexture = terrainHeightTexture;
    this._time = 0;
    this._frame = 0;

    this.initFluidSystem();
    this.startAnimation();
  }

  initFluidSystem () {
    try {
      console.log("初始化流体模拟系统...");
      console.log("地形高度纹理:", this._terrainHeightTexture);
      
      // 创建计算纹理
      this._texA = this.createComputeTexture();
      this._texB = this.createComputeTexture();
      this._texC = this.createComputeTexture();
      this._texD = this.createComputeTexture();
      
      console.log("计算纹理创建完成");
      
      // 创建计算着色器
      this.createComputeShaders();
      
      console.log("计算着色器创建完成");
      
      // 创建渲染着色器
      this.createRenderShader();
      
      console.log("流体模拟系统初始化完成");
    } catch (error) {
      console.error("初始化流体系统失败:", error);
    }
  }

  createComputeTexture () {
    return new Cesium.Texture({
      context: this._viewer.scene.context,
      width: this._width,
      height: this._height,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._width * this._height * 4)
    });
  }

  createComputeShaders () {
    // Buffer A - 计算地形和更新水位
    const bufferA = new CustomPrimitive({
      commandType: 'Compute',
      uniformMap: {
        iTime: () => this._time,
        iFrame: () => this._frame,
        iChannel0: () => this._texC,
        iChannel1: () => this._texD,
        heightMap: () => this._terrainHeightTexture
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [this.getBufferAShader()]
      }),
      geometry: this.getFullscreenQuad(),
      outputTexture: this._texA
    });

    // Buffer B - 更新流出量
    const bufferB = new CustomPrimitive({
      commandType: 'Compute',
      uniformMap: {
        iTime: () => this._time,
        iFrame: () => this._frame,
        iChannel0: () => this._texA,
        iChannel1: () => this._texD
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [this.getBufferBShader()]
      }),
      geometry: this.getFullscreenQuad(),
      outputTexture: this._texB
    });

    // Buffer C - 水位第二遍
    const bufferC = new CustomPrimitive({
      commandType: 'Compute',
      uniformMap: {
        iTime: () => this._time,
        iFrame: () => this._frame,
        iChannel0: () => this._texA,
        iChannel1: () => this._texB
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [this.getBufferCShader()]
      }),
      geometry: this.getFullscreenQuad(),
      outputTexture: this._texC
    });

    // Buffer D - 流出量第二遍
    const bufferD = new CustomPrimitive({
      commandType: 'Compute',
      uniformMap: {
        iTime: () => this._time,
        iFrame: () => this._frame,
        iChannel0: () => this._texC,
        iChannel1: () => this._texB
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [this.getBufferDShader()]
      }),
      geometry: this.getFullscreenQuad(),
      outputTexture: this._texD
    });

    this._bufferA = bufferA;
    this._bufferB = bufferB;
    this._bufferC = bufferC;
    this._bufferD = bufferD;

    this._viewer.scene.primitives.add(bufferA);
    this._viewer.scene.primitives.add(bufferB);
    this._viewer.scene.primitives.add(bufferC);
    this._viewer.scene.primitives.add(bufferD);
  }

  createRenderShader () {
    // 创建水体渲染几何体
    const positions = new Float32Array([
      -1.0, -1.0, 0.0,
      1.0, -1.0, 0.0,
      1.0, 1.0, 0.0,
      -1.0, 1.0, 0.0
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);
    const st = new Float32Array([0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]);

    const geometry = new Cesium.Geometry({
      attributes: {
        position: new Cesium.GeometryAttribute({
          componentDatatype: 5126,
          componentsPerAttribute: 3,
          values: positions
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: 5126,
          componentsPerAttribute: 2,
          values: st
        })
      },
      indices: indices,
      primitiveType: 4,
      boundingSphere: Cesium.BoundingSphere.fromVertices(positions)
    });

    const renderCommand = new CustomPrimitive({
      commandType: 'Draw',
      geometry: geometry,
      attributeLocations: { position: 0, st: 1 },
      primitiveType: 4,
      uniformMap: {
        iTime: () => this._time,
        iFrame: () => this._frame,
        iResolution: () => new Cesium.Cartesian2(this._width, this._height),
        iChannel0: () => this._texC,
        iChannel1: () => this._terrainHeightTexture
      },
      vertexShaderSource: new Cesium.ShaderSource({
        sources: [`
          in vec3 position;
          in vec2 st;
          out vec2 v_st;
          void main() {
            v_st = st;
            gl_Position = czm_modelViewProjection * vec4(position, 1.0);
          }
        `]
      }),
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [this.getRenderShader()]
      })
    });

    this._renderCommand = renderCommand;
    this._viewer.scene.primitives.add(renderCommand);
  }

  getFullscreenQuad () {
    return new Cesium.Geometry({
      attributes: new Cesium.GeometryAttributes({
        position: new Cesium.GeometryAttribute({
          componentDatatype: 5126,
          componentsPerAttribute: 3,
          values: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0])
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: 5126,
          componentsPerAttribute: 2,
          values: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1])
        })
      }),
      indices: new Uint32Array([3, 2, 0, 0, 2, 1]),
      primitiveType: 4
    });
  }

  getBufferAShader () {
    return `
      #version 300 es
      precision highp float;
      
  uniform sampler2D iChannel0;
  uniform sampler2D iChannel1;
  uniform sampler2D heightMap;
  uniform float iTime;
  uniform int iFrame;
      
      
      const int textureSize = 256;
      const float attenuation = 0.995;
      const float strenght = 0.25;
      const float minTotalFlow = 0.0001;
      const float initialWaterLevel = 0.05;

  vec2 readHeight(ivec2 p) {
        p = clamp(p, ivec2(0), ivec2(textureSize - 1));
        return texelFetch(iChannel0, p, 0).xy;
  }

  vec4 readOutFlow(ivec2 p) {
        if(p.x < 0 || p.y < 0 || p.x >= textureSize || p.y >= textureSize)
      return vec4(0);
    return texelFetch(iChannel1, p, 0);
  }

  void main() {
        if(max(gl_FragCoord.x, gl_FragCoord.y) > float(textureSize))
      discard;

    ivec2 p = ivec2(gl_FragCoord.xy);
        vec2 height = readHeight(p);
        
        // 从地形纹理读取高度
        vec2 terrainHeight = texelFetch(heightMap, p, 0).xy;
        float terrainElevation = terrainHeight.x * 0.5;
        
        // 水体计算
        float waterDept = initialWaterLevel;
    if(iFrame != 0) {
      vec4 OutFlow = texelFetch(iChannel1, p, 0);
      float totalOutFlow = OutFlow.x + OutFlow.y + OutFlow.z + OutFlow.w;
      float totalInFlow = 0.0;
      totalInFlow += readOutFlow(p + ivec2( 1, 0)).z;
      totalInFlow += readOutFlow(p + ivec2( 0, 1)).w;
      totalInFlow += readOutFlow(p + ivec2(-1, 0)).x;
      totalInFlow += readOutFlow(p + ivec2( 0, -1)).y;
      waterDept = height.y - totalOutFlow + totalInFlow;
    }
        
    out_FragColor = vec4(terrainElevation, waterDept, 0, 1);
  }
`;
  }

  getBufferBShader () {
    return `
      #version 300 es
      precision highp float;
      
  uniform sampler2D iChannel0;
  uniform sampler2D iChannel1;
  uniform float iTime;
  uniform int iFrame;
      
      
      const int textureSize = 256;
      const float attenuation = 0.995;
      const float strenght = 0.25;
      const float minTotalFlow = 0.0001;

  vec2 readHeight(ivec2 p) {
        p = clamp(p, ivec2(0), ivec2(textureSize - 1));
    return texelFetch(iChannel0, p, 0).xy;
  }

  float computeOutFlowDir(vec2 centerHeight, ivec2 pos) {
    vec2 dirHeight = readHeight(pos);
    return max(0.0, (centerHeight.x + centerHeight.y) - (dirHeight.x + dirHeight.y));
  }

  void main() {
    ivec2 p = ivec2(gl_FragCoord.xy);
        
    if(iFrame == 0) {
      out_FragColor = vec4(0);
      return;
    }
        
        if(max(p.x, p.y) > textureSize)
      discard;

    vec4 oOutFlow = texelFetch(iChannel1, p, 0);
    vec2 height = readHeight(p);
    vec4 nOutFlow;
    nOutFlow.x = computeOutFlowDir(height, p + ivec2( 1, 0));
    nOutFlow.y = computeOutFlowDir(height, p + ivec2( 0, 1));
    nOutFlow.z = computeOutFlowDir(height, p + ivec2(-1, 0));
    nOutFlow.w = computeOutFlowDir(height, p + ivec2( 0, -1));
    nOutFlow = attenuation * oOutFlow + strenght * nOutFlow;
    float totalFlow = nOutFlow.x + nOutFlow.y + nOutFlow.z + nOutFlow.w;
    if(totalFlow > minTotalFlow) {
      if(height.y < totalFlow) {
        nOutFlow = nOutFlow * (height.y / totalFlow);
      }
    } else {
      nOutFlow = vec4(0);
    }
        
    out_FragColor = nOutFlow;
  }
`;
  }

  getBufferCShader () {
    return `
      #version 300 es
      precision highp float;
      
  uniform sampler2D iChannel0;
  uniform sampler2D iChannel1;
  uniform float iTime;
  uniform int iFrame;
      
      
      const int textureSize = 256;

  vec2 readHeight(ivec2 p) {
        p = clamp(p, ivec2(0), ivec2(textureSize - 1));
    return texelFetch(iChannel0, p, 0).xy;
  }

  vec4 readOutFlow(ivec2 p) {
        if(p.x < 0 || p.y < 0 || p.x >= textureSize || p.y >= textureSize)
      return vec4(0);
    return texelFetch(iChannel1, p, 0);
  }

  void main() {
        if(max(gl_FragCoord.x, gl_FragCoord.y) > float(textureSize))
      discard;

    ivec2 p = ivec2(gl_FragCoord.xy);
    vec2 height = readHeight(p);
    vec4 OutFlow = texelFetch(iChannel1, p, 0);
    float totalOutFlow = OutFlow.x + OutFlow.y + OutFlow.z + OutFlow.w;
    float totalInFlow = 0.0;
    totalInFlow += readOutFlow(p + ivec2( 1, 0)).z;
    totalInFlow += readOutFlow(p + ivec2( 0, 1)).w;
    totalInFlow += readOutFlow(p + ivec2(-1, 0)).x;
    totalInFlow += readOutFlow(p + ivec2( 0, -1)).y;
    float waterDept = height.y - totalOutFlow + totalInFlow;
        
    out_FragColor = vec4(height.x, waterDept, 0, 1);
  }
`;
  }

  getBufferDShader () {
    return `
      #version 300 es
      precision highp float;

  uniform sampler2D iChannel0;
  uniform sampler2D iChannel1;
  uniform float iTime;
  uniform int iFrame;
      
      
      const int textureSize = 256;
      const float attenuation = 0.995;
      const float strenght = 0.25;
      const float minTotalFlow = 0.0001;
      
      vec2 readHeight(ivec2 p) {
        p = clamp(p, ivec2(0), ivec2(textureSize - 1));
        return texelFetch(iChannel0, p, 0).xy;
      }
      
      float computeOutFlowDir(vec2 centerHeight, ivec2 pos) {
        vec2 dirHeight = readHeight(pos);
        return max(0.0, (centerHeight.x + centerHeight.y) - (dirHeight.x + dirHeight.y));
      }
      
      void main() {
        ivec2 p = ivec2(gl_FragCoord.xy);
        
        if(max(p.x, p.y) > textureSize)
          discard;
          
        vec4 oOutFlow = texelFetch(iChannel1, p, 0);
        vec2 height = readHeight(p);
        vec4 nOutFlow;
        nOutFlow.x = computeOutFlowDir(height, p + ivec2( 1, 0));
        nOutFlow.y = computeOutFlowDir(height, p + ivec2( 0, 1));
        nOutFlow.z = computeOutFlowDir(height, p + ivec2(-1, 0));
        nOutFlow.w = computeOutFlowDir(height, p + ivec2( 0, -1));
        nOutFlow = attenuation * oOutFlow + strenght * nOutFlow;
        float totalFlow = nOutFlow.x + nOutFlow.y + nOutFlow.z + nOutFlow.w;
        if(totalFlow > minTotalFlow) {
          if(height.y < totalFlow) {
            nOutFlow = nOutFlow * (height.y / totalFlow);
          }
    } else {
          nOutFlow = vec4(0);
        }
        
        out_FragColor = nOutFlow;
      }
    `;
  }

  getRenderShader () {
    return `
      #version 300 es
      precision highp float;
      
      uniform sampler2D iChannel0;
      uniform sampler2D iChannel1;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform int iFrame;
      
      in vec2 v_st;
      out vec4 fragColor;
      
      const int textureSize = 256;
      
      vec2 getHeight(in vec2 p) {
        p = p * vec2(float(textureSize)) / iResolution.xy;
        p = min(p, vec2(float(textureSize) - 0.5) / iResolution.xy);
        vec2 h = texture(iChannel0, p).xy;
        h.y += h.x;
        return h - 0.45;
      }
      
      vec3 getNormal(in vec2 p, int comp) {
        float d = 2.0 / float(textureSize);
        float hMid = getHeight(p)[comp];
        float hRight = getHeight(p + vec2(d, 0))[comp];
        float hTop = getHeight(p + vec2(0, d))[comp];
        return normalize(cross(vec3(0, hTop - hMid, d), vec3(d, hRight - hMid, 0)));
      }
      
      vec3 terrainColor(in vec2 p, in vec3 n, out float spec) {
        spec = 0.1;
        vec3 c = vec3(0.21, 0.50, 0.07);
        float cliff = smoothstep(0.8, 0.3, n.y);
        c = mix(c, vec3(0.25), cliff);
        spec = mix(spec, 0.3, cliff);
        float snow = smoothstep(0.05, 0.25, p.y) * smoothstep(0.5, 0.7, n.y);
        c = mix(c, vec3(0.95, 0.95, 0.85), snow);
        spec = mix(spec, 0.4, snow);
        return c;
      }
      
      vec3 waterColor(in vec2 p, in vec3 n) {
        vec3 c = vec3(0.1, 0.4, 0.8);
        float foam = smoothstep(0.6, 0.8, n.y);
        c = mix(c, vec3(0.9, 0.95, 1.0), foam * 0.3);
        return c;
      }
      
      void main() {
        vec2 p = v_st;
        vec2 h = getHeight(p);
        
        // 地形渲染
        vec3 terrainNormal = getNormal(p, 0);
        float terrainSpec;
        vec3 terrainCol = terrainColor(p, terrainNormal, terrainSpec);
        
        // 水体渲染
        vec3 waterNormal = getNormal(p, 1);
        vec3 waterCol = waterColor(p, waterNormal);
        
        // 混合地形和水体
        vec3 finalColor = mix(terrainCol, waterCol, smoothstep(0.0, 0.1, h.y));
        
        // 添加光照
        vec3 lightDir = normalize(vec3(0.3, 0.8, 0.5));
        float diffuse = max(0.0, dot(lightDir, terrainNormal));
        finalColor = finalColor * (diffuse + 0.3);
        
        fragColor = vec4(finalColor, 1.0);
      }
    `;
  }

  startAnimation () {
    const animate = () => {
      this._time += 0.016;
      this._frame += 0.02;
      requestAnimationFrame(animate);
    };
    animate();
  }
}

const readGeoTif = async () => {
  try {
    const terrain = "gebco_2023_n32.5_s30.0_w120.0_e123.5.tif";
    const rawTiff = await GeoTIFF.fromUrl(terrain);
    const tifImage = await rawTiff.getImage();
    const width = tifImage.getWidth();
    const height = tifImage.getHeight();
    console.log(width, height)
    const data = await tifImage.readRasters({ interleave: true });
    const heightData = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
      heightData[i] = data[i]; // 原始高程（米）
    }
    console.log(heightData)
    const terrainRenderer = new TerrainRenderer(viewer, width, height, heightData);

    // 检查 Cesium 对象是否可用
    if (typeof Cesium !== 'undefined' && Cesium.Geometry) {
      // 创建流体模拟系统，使用地形高度纹理
      const fluidSystem = new FluidSystem(viewer, width, height, terrainRenderer._heightTexture);

      // 添加全局访问以便调试
      window.fluidSystem = fluidSystem;
      console.log("流体模拟系统已创建");
    } else {
      console.error("Cesium 对象不可用，无法创建流体系统");
    }
  } catch (e) {
    console.error("加载 GeoTIFF 失败:", e);
  }
};
const viewer = new Cesium.Viewer("map",
  {
    infoBox: false,
    timeline: false,
    animation: false,
    baseLayerPicker: false,
    sceneModePicker: false,
    selectionIndicator: true,
    shadows: true,
    shouldAnimate: true,
    scene3DOnly: true,
    contextOptions: {
      requestWebgl2: true
    },
    terrain: undefined,
    // 不加载地球底图
    // imageryProvider: false,
    // 不加载地形
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    // 背景透明
    skyBox: false,
    skyAtmosphere: false,
    backgroundColor: Cesium.Color.TRANSPARENT
  });

window.addEventListener("DOMContentLoaded", () => {
  readGeoTif();
})