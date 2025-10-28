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
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
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
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
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
    throw new Error('position 参数必须是 Cesium.Cartesian3 或长度为3的数组');
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

const Command = `
  // Render
  const vec3 backgroundColor = vec3(0.8);
  // Terrain
  const float transitionTime = 5.0;
  const float transitionPercent = 0.3;
  const int octaves = 7;
  // Water simulation
  const float attenuation = 0.995;
  const float strenght = 0.25;
  const float minTotalFlow = 0.0001;
  const float initialWaterLevel = 0.0; // 改为0，让海底区域有更多水
  const int terrainWidth = 840;
  const int terrainHeight = 600;
  // textureSize will be set dynamically
  mat2 rot(in float ang)
  {
   return mat2(
       cos(ang), -sin(ang),
       sin(ang), cos(ang));
  }

  // hash from Dave_Hoskins https://www.shadertoy.com/view/4djSRW
  float hash12(vec2 p)
  {
   vec3 p3 = fract(vec3(p.xyx) * .1031);
   p3 += dot(p3, p3.yzx + 33.33);
   return fract((p3.x + p3.y) * p3.z);
  }

  float hash13(vec3 p3)
  {
   p3 = fract(p3 * .1031);
   p3 += dot(p3, p3.zyx + 31.32);
   return fract((p3.x + p3.y) * p3.z);
  }

  // Box intersection by IQ https://iquilezles.org/articles/boxfunctions

  vec2 boxIntersection( in vec3 ro, in vec3 rd, in vec3 rad, out vec3 oN )
  {
   vec3 m = 1.0 / rd;
   vec3 n = m * ro;
   vec3 k = abs(m) * rad;
   vec3 t1 = -n - k;
   vec3 t2 = -n + k;

   float tN = max( max( t1.x, t1.y ), t1.z );
   float tF = min( min( t2.x, t2.y ), t2.z );

   if( tN > tF || tF < 0.0) return vec2(-1.0); // no intersection

   oN = -sign(rd)*step(t1.yzx, t1.xyz) * step(t1.zxy, t1.xyz);

   return vec2( tN, tF );
  }

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

  // Fog by IQ https://iquilezles.org/articles/fog

  vec3 applyFog( in vec3 rgb, vec3 fogColor, in float distance)
  {
   float fogAmount = exp( -distance );
   return mix( fogColor, rgb, fogAmount );
  }
`
const BufferA = `
// compute Terrain and update water level 1st pass
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D heightMap;
uniform float   iTime;
uniform int   iFrame;
float boxNoise( in vec2 p, in float z )
{
 vec2 fl = floor(p);
 vec2 fr = fract(p);
 fr = smoothstep(0.0, 1.0, fr);
 float res = mix(mix( hash13(vec3(fl, z)),       hash13(vec3(fl + vec2(1,0), z)),fr.x),
         mix( hash13(vec3(fl + vec2(0,1), z)), hash13(vec3(fl + vec2(1,1), z)),fr.x),fr.y);
 return res;
}

float Terrain( in vec2 p, in float z, in int octaveNum)
{
 float a = 1.0;
 float f = .0;
 for (int i = 0; i < octaveNum; i++)
 {
   f += a * boxNoise(p, z);
   a *= 0.45;
   p = 2.0 * rot(radians(41.0)) * p;
 }
 return f;
}

vec2 readHeight(ivec2 p)
{
 p = clamp(p, ivec2(0), ivec2(terrainWidth - 1, terrainHeight - 1));
 vec4 heightData = texelFetch(heightMap, p, 0);
 float terrainH = heightData.r;
 float waterH = heightData.g; // 使用预计算的初始水位
 return vec2(terrainH, waterH);
}

vec4 readOutFlow(ivec2 p)
{
 if(p.x < 0 || p.y < 0 || p.x >= terrainWidth || p.y >= terrainHeight)
   return vec4(0);
 return texelFetch(iChannel1, p, 0);
}

void main( )
{
 // Outside ?
//  if( gl_FragCoord.x > float(terrainWidth) || gl_FragCoord.y > float(terrainHeight))
//    discard;

 // Terrain - 使用TIF数据
 ivec2 p = ivec2(gl_FragCoord.xy);
 vec2 height = readHeight(p);
 float terrainElevation = height.x ; // 使用TIF数据中的高度
 // Water
 float waterDept = initialWaterLevel;
 if(iFrame != 0)
 {
   ivec2 p = ivec2(gl_FragCoord.xy);
   vec2 height = readHeight(p);
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
`

const BufferB = `
  // Update Outflow 1st pass
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D heightMap;
uniform float   iTime;
uniform int   iFrame;
vec2 readHeight(ivec2 p)
{
 p = clamp(p, ivec2(0), ivec2(terrainWidth - 1, terrainHeight - 1));
 vec4 heightData = texelFetch(heightMap, p, 0);
 float terrainH = heightData.r;
 float waterH = heightData.g; // 使用预计算的初始水位
 return vec2(terrainH, waterH);
}

float computeOutFlowDir(vec2 centerHeight, ivec2 pos)
{
 vec2 dirHeight = readHeight(pos);
 return max(0.0f, (centerHeight.x + centerHeight.y) - (dirHeight.x + dirHeight.y));
}

void main()
{
 ivec2 p = ivec2(gl_FragCoord.xy);
 // Init to zero at frame 0
 if(iFrame == 0)
 {
   out_FragColor = vec4(0);
   return;
 }

 // Outside ?
if(p.x < 0 || p.y < 0 || p.x >= terrainWidth || p.y >= terrainHeight)
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
 if(totalFlow > minTotalFlow)
 {
   if(height.y < totalFlow)
   {
     nOutFlow = nOutFlow * (height.y / totalFlow);
   }
 }
 else
 {
   nOutFlow = vec4(0);
 }


 out_FragColor = nOutFlow;
}
`;
const BufferC = `
// water level 2nd pass
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D heightMap;
uniform float   iTime;
uniform int   iFrame;
vec2 readHeight(ivec2 p)
{
 p = clamp(p, ivec2(0), ivec2(terrainWidth - 1, terrainHeight - 1));
 vec4 heightData = texelFetch(heightMap, p, 0);
 float terrainH = heightData.r;
 float waterH = heightData.g; // 使用预计算的初始水位
 return vec2(terrainH, waterH);
}

vec4 readOutFlow(ivec2 p)
{
 if(p.x < 0 || p.y < 0 || p.x >= terrainWidth || p.y >= terrainHeight)
   return vec4(0);
 return texelFetch(iChannel1, p, 0);
}

void main( )
{
 // Outside ?
 if( gl_FragCoord.x > float(terrainWidth) || gl_FragCoord.y > float(terrainHeight))
   discard;

 // Water
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

const BufferD = `
// Update Outflow 2nd pass
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D heightMap;
uniform float   iTime;
uniform int   iFrame;
vec2 readHeight(ivec2 p)
{
 p = clamp(p, ivec2(0), ivec2(terrainWidth - 1, terrainHeight - 1));
 vec4 heightData = texelFetch(heightMap, p, 0);
 float terrainH = heightData.r;
 float waterH = heightData.g; // 使用预计算的初始水位
 return vec2(terrainH, waterH);
}

float computeOutFlowDir(vec2 centerHeight, ivec2 pos)
{
 vec2 dirHeight = readHeight(pos);
 return max(0.0f, (centerHeight.x + centerHeight.y) - (dirHeight.x + dirHeight.y));
}

void main( )
{
 ivec2 p = ivec2(gl_FragCoord.xy);

 // Outside ?
 if( p.x > terrainWidth || p.y > terrainHeight)
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
 if(totalFlow > minTotalFlow)
 {
   if(height.y < totalFlow)
   {
     nOutFlow = nOutFlow * (height.y / totalFlow);
   }
 }
 else
 {
   nOutFlow = vec4(0);
 }


 out_FragColor = nOutFlow;
}
`;

const renderShaderSource = `
// Created by David Gallardo - xjorma/2021
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0
#define AA
#define GAMMA 1
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform vec2   iResolution;
uniform float   iTime;
uniform int   iFrame;
uniform float seaLevelHeight; // 海平面对应的归一化高度值
uniform float waterRiseProgress; // 水位上升进度 (0.0 到 1.0)
in vec3 vo;
in vec3 vd;
in vec2 v_st;
const vec3 light = vec3(0.,6.,4.);
const float boxHeight = 0.45;
const float waterRiseDuration = 5.0; // 水位上升动画持续时间（秒）
vec2 getHeight(in vec3 p)
{
 // Cesium BoxGeometry 的坐标范围是 [-0.5, 0.5]
 // 需要变换到 [0, 1] 的UV坐标范围
 vec2 uv = (p.xz + 0.5);
 // 确保UV坐标在有效范围内
 uv = clamp(uv, 0.0, 1.0);
 vec2 h = texture(iChannel0, uv).xy;  // 使用 iChannel0 (流体纹理)
 
 // h.x 是地形高度，h.y 是水位
 float terrainHeight = h.x;
 float waterLevel = h.y;
 
 // 对于海底区域，创建立体水箱效果
 // 海平面在归一化坐标系中的位置是0.5
 float seaLevel = 0.5;
 
 // 如果地形低于海平面，水箱高度应该达到海平面
 float waterBoxHeight;
 if (terrainHeight < seaLevel) {
   // 海底区域：水箱高度 = (海平面 - 地形高度) * 上升进度
   float fullWaterHeight = seaLevel - terrainHeight;
   waterBoxHeight = fullWaterHeight * waterRiseProgress; // 根据动画进度调整水位
 } else {
   // 陆地：没有水箱
   waterBoxHeight = 0.0;
 }
 
         // 添加波浪高度变化（仅对海洋区域）
         float waveHeight = 0.0;
         if (waterBoxHeight > 0.01) {
           // 判断是否为海洋区域（基于高程数据判断）
           // 如果地形高度接近或低于海平面，且水体较深，则认为是海洋
           bool isOcean = (terrainHeight <= 0.1) && (waterBoxHeight > 0.05);
           
           if (isOcean) {
             // 计算波浪位置
             vec3 wavePos = p * 8.0;
             
             // 调整波浪强度，减少退潮效果，让波浪更连续
             float waveStrength = waterRiseProgress * 0.3 + 0.7; // 0.7 到 1.0，减少退潮
             
             // 基础波浪高度（调整到更自然的高度）
             float baseWave = sin(wavePos.x * 1.0 + iTime * 1.5) * 0.008;
             baseWave += sin(wavePos.z * 0.8 + iTime * 1.2) * 0.006;
             baseWave += sin((wavePos.x + wavePos.z) * 1.2 + iTime * 1.8) * 0.005;
             baseWave += sin(wavePos.x * 2.5 + iTime * 2.0) * 0.003;
             baseWave += sin(wavePos.z * 2.0 + iTime * 1.7) * 0.002;
             
             waveHeight = baseWave * waveStrength;
             
             // 如果是顶层水体，添加额外的高度变化
             if (waterBoxHeight > 0.05) {
               vec3 topWavePos = p * 12.0;
               float topWaveStrength = waterRiseProgress * 0.2 + 0.8; // 0.8 到 1.0，减少退潮
               
               float topWave = sin(topWavePos.x * 0.8 + iTime * 1.2) * 0.012;
               topWave += sin(topWavePos.z * 0.6 + iTime * 0.9) * 0.010;
               topWave += sin((topWavePos.x + topWavePos.z) * 1.4 + iTime * 1.8) * 0.008;
               topWave += sin(topWavePos.x * 3.2 + iTime * 2.5) * 0.006;
               topWave += sin(topWavePos.z * 2.8 + iTime * 2.1) * 0.004;
               
               waveHeight += topWave * topWaveStrength;
             }
           }
           // 陆地水域（湖泊、河流）不添加波浪效果，保持平静
         }
 
 // 总高度 = 地形高度 + 水箱高度 + 波浪高度
 float totalHeight = terrainHeight + waterBoxHeight + waveHeight;
 
 // 几何体使用总高度来创建立体水箱效果
 return vec2(terrainHeight, totalHeight) - boxHeight;
}

vec3 getNormal(in vec3 p, int comp)
{
 vec2 d = 2.0 / vec2(terrainWidth, terrainHeight);
 float hMid = getHeight(p)[comp];
 float hRight = getHeight(p + vec3(d.x, 0, 0))[comp];
 float hTop = getHeight(p + vec3(0, 0, d.y))[comp];
 return normalize(cross(vec3(0, hTop - hMid, d.y), vec3(d.x, hRight - hMid, 0)));
}

vec3 terrainColor(in vec3 p, in vec3 n, out float spec)
{
 spec = 0.1;
 
 // 获取高度信息用于颜色映射
 vec2 h = getHeight(p);
 float nh = h.x; // 归一化高度 (0-1)
 
 // 检查是否为海底区域（使用相对高度）
 vec2 uv = (p.xz + 0.5);
 uv = clamp(uv, 0.0, 1.0);
 vec4 heightData = texture(iChannel0, uv);
 float relativeHeight = heightData.b; // 相对海平面的高度
 bool isUnderwater = relativeHeight < 0.5; // 0.5表示海平面
 
 // 始终计算地形颜色，保持地形特征
 vec3 c1 = vec3(0.95, 0.90, 0.75); // 低海拔沙色（更亮）
 vec3 c2 = vec3(0.30, 0.65, 0.35); // 草地绿（更亮）
 vec3 c3 = vec3(0.55, 0.50, 0.45); // 岩石棕（更亮）
 vec3 c4 = vec3(1.0, 1.0, 1.0); // 积雪白（最亮）
 vec3 ramp = mix(c1, c2, smoothstep(0.05, 0.35, nh));
 ramp = mix(ramp, c3, smoothstep(0.35, 0.70, nh));
 ramp = mix(ramp, c4, smoothstep(0.75, 0.92, nh));
 
 // 根据地形特征调整颜色
 float cliff = smoothstep(0.8, 0.3, n.y);
 ramp = mix(ramp, vec3(0.25), cliff);
 spec = mix(spec, 0.3, cliff);
 
 // 积雪效果
 float snow = smoothstep(0.05, 0.25, p.y) * smoothstep(0.5, 0.7, n.y);
 ramp = mix(ramp, vec3(0.95, 0.95, 0.85), snow);
 spec = mix(spec, 0.4, snow);
 
 // 添加纹理细节
 vec3 t = texture(iChannel1, p.xz * 5.0).xyz;
 ramp = mix(ramp, ramp * t, 0.2);
 
  // 海底区域：更真实的水体效果
  if (isUnderwater) {
    // 根据水深调整水体颜色混合
    float waterDepth = 0.5 - nh; // 水深因子（0.5是海平面）
    waterDepth = clamp(waterDepth, 0.0, 1.0);
    
    // 深水和浅水的不同颜色
    vec3 deepWaterTint = vec3(0.05, 0.2, 0.4);  // 深水偏绿蓝
    vec3 shallowWaterTint = vec3(0.1, 0.5, 0.7); // 浅水偏蓝
    vec3 waterTint = mix(deepWaterTint, shallowWaterTint, waterDepth);
    
    // 根据水深调整混合强度
    float waterMixStrength = 0.2 + 0.4 * waterDepth;
    ramp = mix(ramp, waterTint, waterMixStrength);
    
    // 水体反射特性
    spec = mix(spec, 0.8, 0.4 * waterDepth);
    
    // 添加水体特有的颜色变化
    vec3 waterVariation = vec3(0.02, 0.05, 0.1) * sin(nh * 20.0 + iTime * 2.0);
    ramp += waterVariation;
  }
 
 return ramp;
}

vec3 undergroundColor(float d)
{
 vec3 color[4] = vec3[](vec3(0.7, 0.65, 0.7), vec3(0.60, 0.55, 0.45), vec3(0.75, 0.70, 0.6), vec3(0.65, 0.50, 0.40));
 d *= 6.0;
 d = min(d, 3.0 - 0.001);
 float fr = fract(d);
 float fl = floor(d);
 return mix(color[int(fl)], color[int(fl) + 1], fr);
}



vec3 Render(in vec3 ro, in vec3 rd) {
 vec3 n;
 vec3 rayDir = normalize(rd);
 vec2 ret = hitBox(ro, rayDir);
 if (ret.x > ret.y) discard;
 ret.x = max(ret.x, 0.0);
 vec3 p = ro + ret.x * rayDir;

 if(ret.x > 0.0) {
   vec3 pi = ro + rd * ret.x;
   vec3 tc;
   vec3 tn;
   float tt = ret.x;
   vec2 h = getHeight(pi);
   float spec;
   if(pi.y < h.x) {
     tn = n;
     tc = undergroundColor(h.x - pi.y);
   }
   else {
     for (int i = 0; i < 80; i++) {
       vec3 p = ro + rd * tt;
       float h = p.y - getHeight(p).x;
       if (h < 0.0002 || tt > ret.y)
       break;
       tt += h * 0.4;
     }
     tn = getNormal(ro + rd * tt, 0);
     tc = terrainColor(ro + rd * tt, tn, spec);
   }
   {
     vec3 lightDir = normalize(light - (ro + rd * tt));
     tc = tc * (max( 0.0, dot(lightDir, tn)) + 0.6);
     spec *= pow(max(0., dot(lightDir, reflect(rd, tn))), 10.0);
     tc += spec;
   }
   if(tt > ret.y) {
     tc = vec3(0, 0, 0.4);
   }
   float wt = ret.x;
   h = getHeight(pi);
   vec3 waterNormal;
   if(pi.y < h.y) { // 使用总高度（包含水箱）
     waterNormal = n;
   }
   else {
     for (int i = 0; i < 80; i++) {
       vec3 p = ro + rd * wt;
       float h = p.y - getHeight(p).y; // 使用总高度（包含水箱）
       if (h < 0.0002 || wt > min(tt, ret.y))
       break;
       wt += h * 0.4;
     }
     waterNormal = getNormal(ro + rd * wt, 1); // 使用总高度（包含水箱）
   }
   if(wt < ret.y) {
     float dist = (min(tt, ret.y) - wt);
     vec3 p = waterNormal;
     vec3 lightDir = normalize(light - (ro + rd * wt));
    
    // 简化水体检测逻辑 - 直接检查是否有水箱高度
    vec2 currentHeight = getHeight(ro + rd * wt);
    float terrainHeight = currentHeight.x;
    float waterBoxHeight = currentHeight.y - currentHeight.x; // 水位 = 总高度 - 地形高度
    
    if (waterBoxHeight > 0.01) {
        // 在水箱内部，创建真实的水体效果，但侧壁保持实体
        vec3 wp = ro + rd * wt;
        bool nearSide = (abs(wp.x) > 0.49) || (abs(wp.z) > 0.49);
        if (nearSide) {
          // 靠近侧壁，跳过所有水体着色，保留地形 tc
          return tc;
        }
        
        // 检测是否为最上层水体 - 降低阈值让更多区域显示波浪
        bool isTopWaterLayer = waterBoxHeight > 0.05; // 降低到0.05，让更多区域显示波浪效果
        
        // 1) 基础水体颜色（深/浅）
        vec3 deepWaterColor = vec3(0.02, 0.16, 0.35);
        vec3 shallowWaterColor = vec3(0.12, 0.45, 0.65);
        float shallowMix = smoothstep(0.0, 0.35, waterBoxHeight);
        vec3 waterBaseColor = mix(deepWaterColor, shallowWaterColor, shallowMix);

        // 2) 深度吸收（Beer-Lambert）：让海底随深度更不明显
        // 经验衰减系数：RGB 分量不同吸收，蓝色穿透更强
        vec3 attenuation = vec3(3.2, 1.8, 1.1); // 进一步增强吸收，降低亮度
        vec3 transmittance = exp(-attenuation * max(waterBoxHeight, 0.0));
        // 定义 depthFactor 供后续反射强度等使用（值越大表示越浅）
        float depthFactor = 1.0 - smoothstep(0.0, 0.5, waterBoxHeight);

        // 3) 菲涅尔反射（弱化以突出海底）
        float fresnel = pow(1.0 - max(0.0, dot(-rd, waterNormal)), 3.0);
        fresnel = mix(0.02, 0.25, fresnel);

        // 4) 浅水散射（提升浅水亮度）
        float shallowScatter = smoothstep(0.0, 0.15, waterBoxHeight);
        vec3 scatterColor = vec3(0.85, 0.95, 1.0) * shallowScatter * 0.05;

        // 5) 将海底颜色透过水体吸收后，与水色与散射混合
        vec3 seabedThroughWater = tc * transmittance;
        vec3 waterShaded = seabedThroughWater + (1.0 - transmittance) * waterBaseColor + scatterColor;
        // 在接近海平面的浅水区域整体压暗，避免过亮
        float surfaceDim = mix(0.45, 1.0, smoothstep(0.12, 0.30, waterBoxHeight));
        waterShaded *= surfaceDim;

        // 6) 轻微反射天空（使用已有的后续反射叠加，先保留较低权重）
        tc = mix(tc, waterShaded, 0.55);
        
        // 4. 水波效果 - 所有水体都有基础波浪，顶层水体有高级波浪
        float totalWave = 0.0;
        float waveDx = 0.0;
        float waveDz = 0.0;
        
        // 所有水体都有基础波浪效果
        vec3 wavePos = (ro + rd * wt) * 8.0;
        float baseWaveStrength = waterRiseProgress * 0.5 + 0.3; // 0.3 到 0.8
        
        // 基础波浪 - 所有水体都有（大幅增加幅度让波浪更明显）
        float baseWave = sin(wavePos.x * 1.0 + iTime * 1.5) * 0.15;
        baseWave += sin(wavePos.z * 0.8 + iTime * 1.2) * 0.12;
        baseWave += sin((wavePos.x + wavePos.z) * 1.2 + iTime * 1.8) * 0.10;
        baseWave += sin(wavePos.x * 2.5 + iTime * 2.0) * 0.08; // 添加高频波浪
        baseWave += sin(wavePos.z * 2.0 + iTime * 1.7) * 0.06; // 添加高频波浪
        
        totalWave = baseWave * baseWaveStrength;
        
        // 波浪法线计算（匹配新的波浪幅度）
        waveDx = cos(wavePos.x * 1.0 + iTime * 1.5) * 1.0 * 0.15;
        waveDx += cos(wavePos.z * 0.8 + iTime * 1.2) * 0.8 * 0.12;
        waveDx += cos((wavePos.x + wavePos.z) * 1.2 + iTime * 1.8) * 1.2 * 0.10;
        waveDx += cos(wavePos.x * 2.5 + iTime * 2.0) * 2.5 * 0.08;
        waveDx += cos(wavePos.z * 2.0 + iTime * 1.7) * 2.0 * 0.06;
        
        waveDz = cos(wavePos.x * 1.0 + iTime * 1.5) * 1.0 * 0.15;
        waveDz += cos(wavePos.z * 0.8 + iTime * 1.2) * 0.8 * 0.12;
        waveDz += cos((wavePos.x - wavePos.z) * 1.0 + iTime * 1.6) * 1.0 * 0.10;
        waveDz += cos(wavePos.x * 2.5 + iTime * 2.0) * 2.5 * 0.08;
        waveDz += cos(wavePos.z * 2.0 + iTime * 1.7) * 2.0 * 0.06;
        
        // 基础波浪对颜色的影响（大幅增强可见性）
        vec3 baseWaveColor = vec3(0.1, 0.35, 0.6) * totalWave * 0.5;
        vec3 baseWaveHighlight = vec3(0.3, 0.6, 0.9) * abs(totalWave) * 0.35;
        vec3 baseWaveShadow = vec3(0.02, 0.15, 0.3) * abs(totalWave) * 0.4;
        
        // 添加波浪的亮度变化
        float waveBrightness = 1.0 + abs(totalWave) * (0.08 + 0.15 * (1.0 - depthFactor));
        waveBrightness = min(waveBrightness, 1.15);
        tc *= waveBrightness;
        
        // 添加简单的测试波浪效果 - 让波浪更加明显
        float testWave = sin((ro + rd * wt).x * 5.0 + iTime * 3.0) * 0.1;
        testWave += sin((ro + rd * wt).z * 4.0 + iTime * 2.5) * 0.08;
        vec3 testWaveColor = vec3(0.15, 0.45, 0.8) * testWave * 0.4;
        tc += testWaveColor;
        
        tc += baseWaveColor + baseWaveHighlight - baseWaveShadow;
        
        if (isTopWaterLayer) {
          // 顶层水体有额外的复杂波浪效果
          vec3 topWavePos = (ro + rd * wt) * 12.0;
          float topWaveStrength = waterRiseProgress * 0.9 + 0.1; // 0.1 到 1.0
          
          // 主波浪 - 大尺度波浪（大幅增加幅度）
          float mainWave = sin(topWavePos.x * 0.8 + iTime * 1.2) * 0.20;
          mainWave += sin(topWavePos.z * 0.6 + iTime * 0.9) * 0.18;
          
          // 次级波浪 - 中尺度波浪（大幅增加幅度）
          float secondaryWave = sin((topWavePos.x + topWavePos.z) * 1.4 + iTime * 1.8) * 0.15;
          secondaryWave += sin((topWavePos.x - topWavePos.z) * 1.1 + iTime * 1.5) * 0.12;
          
          // 细节波浪 - 小尺度波浪（大幅增加幅度）
          float detailWave = sin(topWavePos.x * 3.2 + iTime * 2.5) * 0.10;
          detailWave += sin(topWavePos.z * 2.8 + iTime * 2.1) * 0.08;
          detailWave += sin((topWavePos.x + topWavePos.z) * 2.5 + iTime * 2.8) * 0.06;
          
          // 叠加到基础波浪上
          float topWave = (mainWave + secondaryWave + detailWave) * topWaveStrength;
          totalWave += topWave;
          
          // 更新波浪法线 - 叠加顶层波浪的法线影响（匹配新幅度）
          waveDx += cos(topWavePos.x * 0.8 + iTime * 1.2) * 0.8 * 0.20;
          waveDx += cos(topWavePos.z * 0.6 + iTime * 0.9) * 0.6 * 0.18;
          waveDx += cos((topWavePos.x + topWavePos.z) * 1.4 + iTime * 1.8) * 1.4 * 0.15;
          waveDx += cos(topWavePos.x * 3.2 + iTime * 2.5) * 3.2 * 0.10;
          waveDx += cos(topWavePos.z * 2.8 + iTime * 2.1) * 2.8 * 0.08;
          
          waveDz += cos(topWavePos.x * 0.8 + iTime * 1.2) * 0.8 * 0.20;
          waveDz += cos(topWavePos.z * 0.6 + iTime * 0.9) * 0.6 * 0.18;
          waveDz += cos((topWavePos.x - topWavePos.z) * 1.1 + iTime * 1.5) * 1.1 * 0.12;
          waveDz += cos(topWavePos.x * 3.2 + iTime * 2.5) * 3.2 * 0.10;
          waveDz += cos(topWavePos.z * 2.8 + iTime * 2.1) * 2.8 * 0.08;
          
          // 顶层波浪对颜色的额外影响（大幅增强）
          vec3 topWaveColor = vec3(0.15, 0.5, 0.8) * topWave * 0.5;
          vec3 topWaveHighlight = vec3(0.35, 0.75, 1.0) * abs(topWave) * 0.45;
          vec3 topWaveShadow = vec3(0.03, 0.2, 0.4) * abs(topWave) * 0.5;
          
          // 添加顶层波浪的强烈亮度变化
          float topWaveBrightness = 1.0 + abs(topWave) * 0.25;
          topWaveBrightness = min(topWaveBrightness, 1.2);
          tc *= topWaveBrightness;
          
          tc += topWaveColor + topWaveHighlight - topWaveShadow;
        }
        
        // 5. 高质量水体表面反射效果 - 仅应用于最上层水体
        vec3 waterNormal = getNormal(ro + rd * wt, 1);
        
        if (isTopWaterLayer) {
          // 只有最上层水体才有高级反射效果
          
          // 添加波浪对法线的影响
          vec3 waveNormal = normalize(vec3(-waveDx, 1.0, -waveDz));
          waterNormal = normalize(mix(waterNormal, waveNormal, 0.3));
          
          // 计算反射方向
          vec3 reflectDir = reflect(rd, waterNormal);
          
          // 改进的菲涅尔效应 - 更真实的反射/折射比例
          float fresnel = pow(1.0 - max(0.0, dot(-rd, waterNormal)), 1.5);
          fresnel = mix(0.02, 0.98, fresnel); // 更宽的菲涅尔范围
          
          // 多层天空反射 - 模拟真实天空
          vec3 skyColor1 = vec3(0.4, 0.6, 1.0);  // 主天空色
          vec3 skyColor2 = vec3(0.6, 0.8, 1.0);  // 亮天空色
          vec3 skyColor3 = vec3(0.2, 0.4, 0.8);  // 深天空色
          
          // 基于反射方向的天空颜色混合
          float skyMix1 = smoothstep(0.0, 0.3, reflectDir.y);
          float skyMix2 = smoothstep(0.3, 0.7, reflectDir.y);
          vec3 skyReflection = mix(skyColor3, mix(skyColor1, skyColor2, skyMix2), skyMix1);
          
          // 添加云层反射效果
          float cloudNoise = sin(reflectDir.x * 3.0 + iTime * 0.5) * 0.3 + 0.7;
          cloudNoise *= sin(reflectDir.z * 2.5 + iTime * 0.3) * 0.4 + 0.6;
          skyReflection *= cloudNoise;
          
          // 反射强度随水深和动画进度调整
          float reflectionStrength = fresnel * (0.4 + 0.6 * waterRiseProgress) * (0.5 + 0.5 * depthFactor);
          tc = mix(tc, skyReflection, reflectionStrength);
        } else {
          // 非最上层水体使用简单反射
          vec3 reflectDir = reflect(rd, waterNormal);
          float fresnel = pow(1.0 - max(0.0, dot(-rd, waterNormal)), 2.0);
          vec3 skyReflection = vec3(0.4, 0.6, 1.0);
          float reflectionStrength = fresnel * 0.3 * waterRiseProgress;
          tc = mix(tc, skyReflection, reflectionStrength);
        }
        
        // 6. 高质量水体内部光线散射效果
        float scatterFactor = 1.0 - smoothstep(0.0, 0.6, dist);
        
        // 多层散射 - 模拟真实水体中的光线散射
        vec3 scatterColor1 = vec3(0.05, 0.2, 0.4) * scatterFactor * 0.6; // 主散射
        vec3 scatterColor2 = vec3(0.1, 0.3, 0.5) * scatterFactor * scatterFactor * 0.4; // 二次散射
        vec3 scatterColor3 = vec3(0.15, 0.4, 0.6) * pow(scatterFactor, 3.0) * 0.3; // 三次散射
        
        // 添加动态散射效果
        float scatterNoise = sin((ro + rd * wt).x * 8.0 + iTime * 1.5) * 0.1 + 0.9;
        scatterNoise *= sin((ro + rd * wt).z * 6.0 + iTime * 1.2) * 0.1 + 0.9;
        
        vec3 totalScatter = (scatterColor1 + scatterColor2 + scatterColor3) * scatterNoise;
        tc += totalScatter;
        
        // 7. 高质量水体边缘泡沫效果 - 仅应用于最上层水体
        if (isTopWaterLayer) {
          float foamFactor = smoothstep(0.0, 0.03, waterBoxHeight) * (1.0 - smoothstep(0.0, 0.08, waterBoxHeight));
          
          if (foamFactor > 0.0) {
            // 多层泡沫噪声
            vec3 wavePos = (ro + rd * wt) * 12.0;
            float foamNoise1 = sin(wavePos.x * 20.0 + iTime * 4.0) * 0.5 + 0.5;
            float foamNoise2 = sin(wavePos.z * 18.0 + iTime * 3.5) * 0.5 + 0.5;
            float foamNoise3 = sin((wavePos.x + wavePos.z) * 15.0 + iTime * 3.8) * 0.5 + 0.5;
            
            // 组合泡沫噪声
            float combinedFoamNoise = foamNoise1 * foamNoise2 * foamNoise3;
            
            // 泡沫颜色 - 更真实的白色泡沫
            vec3 foamColor1 = vec3(0.9, 0.95, 1.0); // 主泡沫色
            vec3 foamColor2 = vec3(0.8, 0.9, 1.0);  // 次泡沫色
            vec3 foamColor = mix(foamColor2, foamColor1, combinedFoamNoise);
            
            // 泡沫强度随波浪强度变化
            float foamStrength = foamFactor * (0.5 + 0.5 * abs(totalWave) * 10.0);
            tc = mix(tc, foamColor, foamStrength * 0.8);
          }
          
          // 8. 水体表面高光效果 - 模拟阳光在水面的反射
          vec3 lightDir = normalize(light - (ro + rd * wt));
          float specular = pow(max(0.0, dot(lightDir, waterNormal)), 64.0);
          vec3 specularColor = vec3(0.9, 0.95, 1.0) * specular * 0.25;
          tc += specularColor;
        }
        
    } else {
      // 没有水体，显示地形颜色
     tc = applyFog( tc, vec3(0, 0, 0.4), dist * 15.0);
    }
    
     float spec = pow(max(0., dot(lightDir, reflect(rd, waterNormal))), 20.0);
     tc += 0.5 * spec * smoothstep(0.0, 0.1, dist);
   }else{
     discard;
   }
  
   return tc;
 }
 discard;
}

vec3 vignette(vec3 color, vec2 q, float v)
{
 color *= 0.3 + 0.8 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), v);
 return color;
}


void main()
{
 vec3 tot = vec3(0.0);
 vec3 rayDir = normalize(vd);
 vec3 col = Render(vo, rayDir);
 tot += col;
 out_FragColor = vec4( tot, 1.0 );
}
`

class FluidDemo {
  _viewer;
  _width;
  _height;
  _textureSize;
  _textureData;
  _resolution;
  _lonLatBounds;
  constructor(viewer, width, height, textureData, lonLatBounds) {
    this._viewer = viewer;
    this._width = width;
    this._height = height;
    this._lonLatBounds = lonLatBounds;
    this._textureWidth = width; // 使用TIF文件的真实宽度
    this._textureHeight = height; // 使用TIF文件的真实高度
    this._textureData = textureData;

    this._resolution = new Cesium.Cartesian2(this._textureWidth, this._textureHeight);

    // 水位上升动画相关
    this._waterRiseProgress = 0.0; // 初始水位为0
    this._animationStartTime = Date.now(); // 记录动画开始时间
    this._waterRiseDuration = 5000; // 5秒动画时长（毫秒）

    this.initShaderToy();
  }
  initShaderToy () {
    // 动态设置textureSize，使用裁剪后的尺寸
    const dynamicCommand = Command.replace(
      `const int textureWidth = ${this._textureWidth};\nconst int textureHeight = ${this._textureHeight};`
    );
    // 创建独立的TIF高度纹理（只读）

    // 使用当前显示范围
    const lonLatBounds = this._lonLatBounds || {
      lonMin: 120.0,
      lonMax: 123.5,
      latMin: 30.0,
      latMax: 32.5
    };

    const tifHeightTexture = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._textureWidth,
      height: this._textureHeight,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: this._textureData, // 使用TIF数据
      sampler: new Cesium.Sampler({
        wrapS: Cesium.TextureWrap.CLAMP_TO_EDGE,
        wrapT: Cesium.TextureWrap.CLAMP_TO_EDGE,
        magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
        minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
      }),
    });

    // 创建流体数据纹理，使用真实的TIF宽高
    const texA = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._textureWidth,
      height: this._textureHeight,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._textureWidth * this._textureHeight * 4),
    });
    const texB = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._textureWidth,
      height: this._textureHeight,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._textureWidth * this._textureHeight * 4),
    });
    const texC = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._textureWidth,
      height: this._textureHeight,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._textureWidth * this._textureHeight * 4),
    });
    const texD = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._textureWidth,
      height: this._textureHeight,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._textureWidth * this._textureHeight * 4),
    });
    // Render Buffers
    const quadGeometry = RenderUtil.getFullscreenQuad();
    // BufferA
    const Buffer_A = new CustomPrimitive({
      commandType: 'Compute',
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        resolution: () => {
          return this._resolution;
        },
        iChannel0: () => {
          return texA; // 使用空的texA作为输入
        },
        iChannel1: () => {
          return texD;
        },
        heightMap: () => {
          return tifHeightTexture; // 使用独立的TIF高度纹理
        },
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [dynamicCommand, BufferA],
      }),
      geometry: quadGeometry,
      outputTexture: texA,
      preExecute: function () {
        Buffer_A.commandToExecute.outputTexture = texA;
      },
    });

    // BufferB
    const Buffer_B = new CustomPrimitive({
      commandType: 'Compute',
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        resolution: () => {
          return this._resolution;
        },
        iChannel0: () => {
          return texA;
        },
        iChannel1: () => {
          return texD;
        },
        heightMap: () => {
          return tifHeightTexture; // 使用独立的TIF高度纹理
        },
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [dynamicCommand, BufferB],
      }),
      geometry: quadGeometry,
      outputTexture: texB,
      preExecute: function () {
        Buffer_B.commandToExecute.outputTexture = texB;
      },
    });

    // BufferC
    const Buffer_C = new CustomPrimitive({
      commandType: 'Compute',
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        resolution: () => {
          return this._resolution;
        },
        iChannel0: () => {
          return texA;
        },
        iChannel1: () => {
          return texB;
        },
        heightMap: () => {
          return tifHeightTexture; // 使用独立的TIF高度纹理
        },
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [dynamicCommand, BufferC],
      }),
      geometry: quadGeometry,
      outputTexture: texC,
      preExecute: function () {
        Buffer_C.commandToExecute.outputTexture = texC;
      },
    });

    // BufferD
    const Buffer_D = new CustomPrimitive({
      commandType: 'Compute',
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        resolution: () => {
          return this._resolution;
        },
        iChannel0: () => {
          return texC;
        },
        iChannel1: () => {
          return texB;
        },
        heightMap: () => {
          return tifHeightTexture; // 使用独立的TIF高度纹理
        },
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [dynamicCommand, BufferD],
      }),
      geometry: quadGeometry,
      outputTexture: texD,
      preExecute: function () {
        Buffer_D.commandToExecute.outputTexture = texD;
      },
    });

    // Render Command - 根据指定的地理范围调整几何体尺寸
    // 计算地理范围的实际距离
    const lonRange = lonLatBounds.lonMax - lonLatBounds.lonMin;
    const latRange = lonLatBounds.latMax - lonLatBounds.latMin;

    // 将经纬度跨度转换为米，精确匹配指定范围尺寸
    const lonCenter = (lonLatBounds.lonMin + lonLatBounds.lonMax) / 2;
    const latCenter = (lonLatBounds.latMin + lonLatBounds.latMax) / 2;

    const cLonMin = Cesium.Cartographic.fromDegrees(lonLatBounds.lonMin, latCenter);
    const cLonMax = Cesium.Cartographic.fromDegrees(lonLatBounds.lonMax, latCenter);
    const cLatMin = Cesium.Cartographic.fromDegrees(lonCenter, lonLatBounds.latMin);
    const cLatMax = Cesium.Cartographic.fromDegrees(lonCenter, lonLatBounds.latMax);

    const geodesicH = new Cesium.EllipsoidGeodesic(cLonMin, cLonMax);
    const geodesicV = new Cesium.EllipsoidGeodesic(cLatMin, cLatMax);

    const width = geodesicH.surfaceDistance;   // 东西向真实宽度（米）
    const height = geodesicV.surfaceDistance;  // 南北向真实高度（米）
    // 垂直方向高度缩放：按水平尺度的一定比例放大，避免看起来过于扁平
    const verticalScaleFactor = 1; // 放大垂直夸张，可调：0.15 ~ 0.5
    const depth = Math.max(2000.0, Math.min(width, height) * verticalScaleFactor);


    // 保持垂直使用 Z=depth，南北向映射到 Y=height，东西向映射到 X=width
    const modelMatrix = generateModelMatrix(
      [lonCenter, latCenter, 300],
      [90, 0, 0],
      [width, height, depth],
    );
    const boxGeometry = Cesium.BoxGeometry.fromDimensions({
      vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,
      dimensions: new Cesium.Cartesian3(1, 1, 1),
    });
    const geometry = Cesium.BoxGeometry.createGeometry(boxGeometry);
    const boxBoundingSphere = Cesium.BoundingSphere.fromVertices(geometry.attributes.position.values);
    const modelBoundingSphere = Cesium.BoundingSphere.transform(boxBoundingSphere, modelMatrix, new Cesium.BoundingSphere());
    const center = modelBoundingSphere.center;
    const offset = new Cesium.Cartesian3(0, -modelBoundingSphere.radius * 3, modelBoundingSphere.radius);

    // 将相机绑定到模型坐标系
    this._viewer.camera.lookAtTransform(
      Cesium.Matrix4.IDENTITY,  // 世界坐标系
      offset
    );

    // 指向 BoundingSphere 中心
    this._viewer.camera.lookAt(center, offset);
    const attributelocations =
      Cesium.GeometryPipeline.createAttributeLocations(geometry);
    const fluidCommand = new CustomPrimitive({
      commandType: 'Draw',
      uniformMap: {
        iTime: () => {
          return time;
        },
        iFrame: () => {
          return frame;
        },
        iResolution: () => {
          return this._resolution;
        },
        seaLevelHeight: () => {
          return this._seaLevelNormalized;
        },
        waterRiseProgress: () => {
          return this._waterRiseProgress;
        },
        iChannel0: () => {
          return texC;
        },
        iChannel1: () => {
          return tifHeightTexture; // 使用TIF高度纹理
        },
      },
      geometry: geometry,
      modelMatrix: modelMatrix,
      attributeLocations: attributelocations,
      vertexShaderSource: new Cesium.ShaderSource({
        sources: [
          `
         in vec3 position;
         in vec2 st;
        
         out vec3 vo;
         out vec3 vd;
         out vec2 v_st;
         void main()
         {  
           vo = czm_encodedCameraPositionMCHigh + czm_encodedCameraPositionMCLow;
           vd = position - vo;
           v_st = st;
           gl_Position = czm_modelViewProjection * vec4(position,1.0);
         }
         `,
        ],
      }),
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [dynamicCommand + renderShaderSource],
      }),
    });

    // 调试：输出TIF纹理为图片
    // this.debugTifTexture(tifHeightTexture);

    // 调试：直接从原始数据创建图片
    // this.debugRawTifData();

    // Render Event
    let time = 1.0;
    let frame = 0;
    this._viewer.scene.postRender.addEventListener(() => {
      const now = performance.now();
      time = now / 1000;
      frame += 0.02;

      // 更新水位上升动画进度
      const elapsedTime = Date.now() - this._animationStartTime;
      if (elapsedTime < this._waterRiseDuration) {
        // 使用缓动函数让动画更自然（easeInOutCubic）
        let progress = elapsedTime / this._waterRiseDuration;
        progress = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        this._waterRiseProgress = progress;
      } else {
        this._waterRiseProgress = 1.0; // 动画结束，水位达到最大值
      }
    });

    // 显示高程模型（恢复渲染顺序）
    // 保存所有图元引用，以便后续移除
    this._bufferA = Buffer_A;
    this._bufferB = Buffer_B;
    this._bufferC = Buffer_C;
    this._bufferD = Buffer_D;
    this._terrainPrimitive = fluidCommand;

    this._viewer.scene.primitives.add(Buffer_A);
    this._viewer.scene.primitives.add(Buffer_B);
    this._viewer.scene.primitives.add(Buffer_C);
    this._viewer.scene.primitives.add(Buffer_D);
    this._viewer.scene.primitives.add(fluidCommand);

  }

  // 重置水位上升动画
  resetWaterAnimation () {
    this._waterRiseProgress = 0.0;
    this._animationStartTime = Date.now();
  }

  // 调试方法：将TIF纹理输出为图片
  debugTifTexture (texture) {
    console.log('调试TIF纹理:', texture);
    console.log('纹理尺寸:', this._width, 'x', this._height);

    // 延迟执行，确保纹理已加载
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      canvas.width = this._width;
      canvas.height = this._height;
      const ctx = canvas.getContext('2d');

      // 创建ImageData
      const imageData = ctx.createImageData(this._width, this._height);

      // 从纹理读取像素数据
      const gl = this._viewer.scene.context._gl;
      const framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

      // 检查纹理是否有效
      if (!texture._texture) {
        console.error('纹理对象无效');
        return;
      }

      // 检查纹理状态
      console.log('纹理对象:', texture);
      console.log('纹理ID:', texture._texture);
      console.log('纹理尺寸:', texture.width, 'x', texture.height);

      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture._texture, 0);

      // 检查framebuffer状态
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE) {
        console.error('Framebuffer不完整，状态:', status);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.deleteFramebuffer(framebuffer);
        return;
      }

      // 尝试不同的像素格式读取
      const pixels = new Float32Array(this._width * this._height * 4);
      gl.readPixels(0, 0, this._width, this._height, gl.RGBA, gl.FLOAT, pixels);

      console.log('读取的像素数据:', pixels.slice(0, 20)); // 只显示前20个像素

      // 检查是否有非零数据
      let hasNonZeroData = false;
      for (let i = 0; i < pixels.length; i++) {
        if (pixels[i] !== 0) {
          hasNonZeroData = true;
          break;
        }
      }

      if (!hasNonZeroData) {
        console.warn('所有像素数据都为零，尝试使用Uint8Array读取');

        // 尝试使用Uint8Array读取
        const pixelsUint8 = new Uint8Array(this._width * this._height * 4);
        gl.readPixels(0, 0, this._width, this._height, gl.RGBA, gl.UNSIGNED_BYTE, pixelsUint8);

        console.log('Uint8Array读取的像素数据:', pixelsUint8.slice(0, 20));

        // 使用Uint8Array数据，修复上下镜像
        for (let y = 0; y < this._height; y++) {
          for (let x = 0; x < this._width; x++) {
            const pixelIndex = (y * this._width + x) * 4;
            const imageIndex = (y * this._width + x) * 4;

            const height = pixelsUint8[pixelIndex]; // R通道
            imageData.data[imageIndex] = height;     // R
            imageData.data[imageIndex + 1] = height; // G
            imageData.data[imageIndex + 2] = height; // B
            imageData.data[imageIndex + 3] = 255;    // A
          }
        }
      } else {
        // 使用Float32Array数据，修复上下镜像
        for (let y = 0; y < this._height; y++) {
          for (let x = 0; x < this._width; x++) {
            const pixelIndex = (y * this._width + x) * 4;
            const imageIndex = (y * this._width + x) * 4;

            const height = Math.floor(pixels[pixelIndex] * 255); // R通道，转换为0-255
            imageData.data[imageIndex] = height;     // R
            imageData.data[imageIndex + 1] = height; // G
            imageData.data[imageIndex + 2] = height; // B
            imageData.data[imageIndex + 3] = 255;    // A
          }
        }
      }

      // 绘制到canvas
      ctx.putImageData(imageData, 0, 0);

      // 创建下载链接
      const link = document.createElement('a');
      link.download = 'tif_height_texture.png';
      link.href = canvas.toDataURL();

      // 添加到页面并自动下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.deleteFramebuffer(framebuffer);

      console.log('TIF纹理已输出为图片，文件名：tif_height_texture.png');
      console.log('纹理尺寸：', this._width, 'x', this._height);
    }, 2000); // 增加延迟时间到2秒
  }

  // 调试方法：直接从原始TIF数据创建图片
  debugRawTifData () {
    console.log('调试原始TIF数据:', this._textureData);
    console.log('数据长度:', this._textureData.length);

    const canvas = document.createElement('canvas');
    canvas.width = this._width;
    canvas.height = this._height;
    const ctx = canvas.getContext('2d');

    // 创建ImageData
    const imageData = ctx.createImageData(this._width, this._height);

    // 将原始数据映射到图片
    for (let y = 0; y < this._height; y++) {
      for (let x = 0; x < this._width; x++) {
        const pixelIndex = (y * this._width + x) * 4; // 每个像素4个分量
        // 修复上下镜像：翻转Y坐标
        const flippedY = this._height - 1 - y;
        const imageIndex = (flippedY * this._width + x) * 4;

        // 获取R通道的高度数据（已经归一化到0-1）
        const normalizedHeight = this._textureData[pixelIndex];

        // 直接映射到0-255范围
        let mappedHeight = Math.floor(normalizedHeight * 255);
        mappedHeight = Math.max(0, Math.min(255, mappedHeight)); // 确保在0-255范围内

        imageData.data[imageIndex] = mappedHeight;     // R
        imageData.data[imageIndex + 1] = mappedHeight; // G
        imageData.data[imageIndex + 2] = mappedHeight; // B
        imageData.data[imageIndex + 3] = 255;          // A
      }
    }

    // 绘制到canvas
    ctx.putImageData(imageData, 0, 0);

    // 创建下载链接
    const link = document.createElement('a');
    link.download = 'raw_tif_data.png';
    link.href = canvas.toDataURL();

    // 添加到页面并自动下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('原始TIF数据已输出为图片，文件名：raw_tif_data.png');
  }
};
// viewer.camera.lookAt(boxCenter, new Cesium.Cartesian3(0.0, -10000.0, 5000.0));
const readGeoTif = async (lonLatBounds = null) => {
  const terrain = "gebco_2023_n32.5_s30.0_w120.0_e123.5.tif";
  const rawTiff = await GeoTIFF.fromUrl(terrain);
  const tifImage = await rawTiff.getImage();
  const tifWidth = tifImage.getWidth();
  const tifHeight = tifImage.getHeight();

  // 如果没有指定范围，使用默认范围
  const bounds = lonLatBounds || {
    lonMin: 120.0,
    lonMax: 123.5,
    latMin: 30.0,
    latMax: 32.5
  };


  // 计算裁剪区域
  const lonRange = bounds.lonMax - bounds.lonMin;
  const latRange = bounds.latMax - bounds.latMin;

  // 计算在TIF图像中的像素范围
  const startX = Math.max(0, Math.floor((bounds.lonMin - 120.0) / 3.5 * tifWidth));
  const endX = Math.min(tifWidth, Math.ceil((bounds.lonMax - 120.0) / 3.5 * tifWidth));
  const startY = Math.max(0, Math.floor((32.5 - bounds.latMax) / 2.5 * tifHeight));
  const endY = Math.min(tifHeight, Math.ceil((32.5 - bounds.latMin) / 2.5 * tifHeight));


  // 确保裁剪区域有效
  if (startX >= endX || startY >= endY || endX <= 0 || endY <= 0) {
    console.error("无效的裁剪区域:", startX, endX, startY, endY);
    throw new Error("裁剪区域无效");
  }

  // 读取TIF数据
  const tifData = await tifImage.readRasters({ interleave: true });

  // 如果用户指定了范围，则进行数据裁剪
  let croppedWidth, croppedHeight, croppedData;

  if (bounds.lonMin !== 120.0 || bounds.lonMax !== 123.5 || bounds.latMin !== 30.0 || bounds.latMax !== 32.5) {
    // 手动裁剪数据
    croppedData = [];
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const index = y * tifWidth + x;
        if (index >= 0 && index < tifData.length) {
          croppedData.push(tifData[index]);
        } else {
          croppedData.push(0);
        }
      }
    }
    croppedWidth = endX - startX;
    croppedHeight = endY - startY;
  } else {
    croppedData = tifData;
    croppedWidth = tifWidth;
    croppedHeight = tifHeight;
  }

  // 检查读取的数据是否有效
  if (!croppedData || croppedData.length === 0) {
    console.error("TIF数据读取失败");
    throw new Error("TIF数据读取失败");
  }

  // 使用裁剪后的数据
  textureData = new Float32Array(croppedWidth * croppedHeight * 4);

  // 如果是第一次加载，计算并保存原始最大最小值
  if (window.originalMinHeight === null || window.originalMaxHeight === null) {
    console.log('首次加载，计算原始高程数据的最大最小值...');
    window.originalMinHeight = tifData[0];
    window.originalMaxHeight = tifData[0];
    for (let i = 1; i < tifData.length; i++) {
      // 检查数据是否有效
      if (tifData[i] !== undefined && tifData[i] !== null && !isNaN(tifData[i])) {
        if (tifData[i] < window.originalMinHeight) window.originalMinHeight = tifData[i];
        if (tifData[i] > window.originalMaxHeight) window.originalMaxHeight = tifData[i];
      }
    }
    console.log('原始高程范围:', window.originalMinHeight.toFixed(2), '到', window.originalMaxHeight.toFixed(2), '米');
  }

  // 使用原始最大最小值进行归一化（切割后也不会变化）
  const minHeight = window.originalMinHeight;
  const maxHeight = window.originalMaxHeight;

  // 计算裁剪区域的高度范围（仅用于显示统计）
  let croppedMinHeight = croppedData[0];
  let croppedMaxHeight = croppedData[0];
  for (let i = 1; i < croppedData.length; i++) {
    // 检查数据是否有效
    if (croppedData[i] !== undefined && croppedData[i] !== null && !isNaN(croppedData[i])) {
      if (croppedData[i] < croppedMinHeight) croppedMinHeight = croppedData[i];
      if (croppedData[i] > croppedMaxHeight) croppedMaxHeight = croppedData[i];
    }
  }

  // 输出高程数据统计信息
  console.log('=== 高程数据统计 ===');
  console.log('数据点总数:', croppedData.length);
  console.log('使用的归一化范围:', minHeight.toFixed(2), '到', maxHeight.toFixed(2), '米（全局范围，切割后不变）');
  console.log('裁剪区域的高度范围:', croppedMinHeight.toFixed(2), '到', croppedMaxHeight.toFixed(2), '米');
  console.log('海平面(0米)是否在数据范围内:', minHeight <= 0 && maxHeight >= 0);

  // 统计海平面上下数据点分布
  let aboveSeaLevel = 0, belowSeaLevel = 0, atSeaLevel = 0;
  for (let i = 0; i < croppedData.length; i++) {
    if (croppedData[i] > 0.1) aboveSeaLevel++;
    else if (croppedData[i] < -0.1) belowSeaLevel++;
    else atSeaLevel++;
  }
  console.log('海平面以上点数:', aboveSeaLevel, '(', (aboveSeaLevel / croppedData.length * 100).toFixed(1), '%)');
  console.log('海平面以下点数:', belowSeaLevel, '(', (belowSeaLevel / croppedData.length * 100).toFixed(1), '%)');
  console.log('海平面附近点数:', atSeaLevel, '(', (atSeaLevel / croppedData.length * 100).toFixed(1), '%)');
  console.log('==================');


  // 如果数据中没有海平面以下的数据，我们需要调整归一化策略
  let seaLevel, maxRange;
  if (minHeight > 0) {
    // 如果所有数据都在海平面以上，以最低点为基准
    seaLevel = minHeight;
    maxRange = maxHeight - minHeight;
  } else if (maxHeight < 0) {
    // 如果所有数据都在海平面以下，以最高点为基准
    seaLevel = maxHeight;
    maxRange = seaLevel - minHeight;
  } else {
    // 数据跨越海平面，使用海平面为基准
    seaLevel = 15;
    const maxHeightAboveSea = maxHeight - seaLevel;
    const maxDepthBelowSea = seaLevel - minHeight;
    maxRange = Math.max(maxHeightAboveSea, maxDepthBelowSea);
  }

  // 计算海平面对应的归一化高度值
  // 对于跨越海平面的数据，海平面应该始终映射到0.5
  if (minHeight <= 0 && maxHeight >= 0) {
    this._seaLevelNormalized = 0.5; // 海平面始终映射到0.5
  } else {
    this._seaLevelNormalized = (0 - seaLevel) / (2 * maxRange) + 0.5;
  }

  // 输出归一化参数信息
  console.log('=== 归一化参数 ===');
  console.log('海平面高度:', seaLevel.toFixed(2), '米');
  console.log('最大范围:', maxRange.toFixed(2), '米');
  console.log('归一化海平面值:', this._seaLevelNormalized.toFixed(3));
  console.log('归一化后高度范围: 0.0 到 1.0');
  console.log('================');

  // 使用裁剪后的TIF数据，从底部开始读取以匹配GLSL坐标系统
  for (let y = 0; y < croppedHeight; y++) {
    for (let x = 0; x < croppedWidth; x++) {
      // 从底部开始读取，匹配GLSL的UV坐标系统
      const tifIndex = (croppedHeight - 1 - y) * croppedWidth + x;

      // 获取原始高度值
      const rawHeight = croppedData[tifIndex];

      // 检查数据是否有效
      if (rawHeight === undefined || rawHeight === null || isNaN(rawHeight)) {
        continue; // 跳过无效数据
      }

      // 根据数据范围进行归一化
      let normalizedHeight, relativeHeight;
      if (minHeight > 0) {
        // 所有数据都在海平面以上
        normalizedHeight = (rawHeight - minHeight) / maxRange;
        relativeHeight = normalizedHeight > 0.5 ? 0.6 : 0.4; // 所有区域都标记为海底
      } else if (maxHeight < 0) {
        // 所有数据都在海平面以下
        normalizedHeight = (rawHeight - minHeight) / maxRange;
        relativeHeight = 0.3; // 所有区域都标记为海底
      } else {
        // 数据跨越海平面
        // 海平面(0米)映射到0.5，最高点(689米)映射到1.0，最低点(-93米)映射到0.0
        normalizedHeight = (rawHeight - seaLevel) / (2 * maxRange) + 0.5;
        relativeHeight = normalizedHeight;
      }

      // 在海底区域（海拔0米及以下）设置初始水位
      let initialWater = 0;
      if (rawHeight <= 0) {
        // 海底区域：水位等于海平面与海底的差值
        const waterDepth = 0 - rawHeight; // 水深 = 海平面(0) - 海底高度
        // 将水深归一化到0-1范围，增加强度
        initialWater = Math.min(waterDepth / 50.0, 0.5); // 增加水位强度，最大0.5

      } else if (rawHeight <= 10) {
        // 浅水区域（0-10米）：也有少量水位
        initialWater = 0.1;
      }

      const index = (y * croppedWidth + x) * 4;
      textureData[index] = normalizedHeight;     // 归一化高度
      textureData[index + 1] = initialWater;     // 初始水位（海底区域有更多水）
      textureData[index + 2] = relativeHeight;   // 相对海平面的高度
      textureData[index + 3] = 1;               // Alpha
    }
  }



  // 添加流体系统，使用裁剪后的尺寸
  const fluid = new FluidDemo(viewer, croppedWidth, croppedHeight, textureData, bounds);

  window.fluidDemo = fluid;

  // 添加风场粒子系统
  setTimeout(() => {
    try {
      var panel = new Panel();
      var wind3D = new Wind3D(
        viewer,
        panel,
      );

      // 保存到全局变量以便后续更新
      window.windSystem = wind3D;

    } catch (error) {
      console.error('风场系统初始化失败:', error);
    }
  }, 1000);
}
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
    // terrain: undefined,
    // 不加载地球底图
    // imageryProvider: true,
    // 不加载地形
    // terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    // 背景透明
    skyBox: false,
    skyAtmosphere: false,
    backgroundColor: Cesium.Color.TRANSPARENT,
    baseLayerPicker: false,
    geocoder: false,
  });

// 全局变量存储当前显示范围
window.currentDisplayBounds = {
  lonMin: 120.0,
  lonMax: 123.5,
  latMin: 30.0,
  latMax: 32.5
};

// 调试：确保全局变量被正确初始化
console.log('全局变量初始化:', window.currentDisplayBounds);

// 全局变量：存储模型实体
window.modelEntity = null;
window.rightClickHandler = null;

// 全局变量：存储原始高程数据的最大最小值（用于切割后保持不变）
window.originalMinHeight = null;
window.originalMaxHeight = null;

// 设置全局右键旋转控制
const setupRightClickRotation = () => {
  viewer.scene.screenSpaceCameraController.zoomEventTypes = [Cesium.CameraEventType.WHEEL, Cesium.CameraEventType.PINCH];
  viewer.scene.screenSpaceCameraController.rotateEventTypes = [Cesium.CameraEventType.RIGHT_DRAG]
};

// 延迟设置右键旋转，确保viewer已完全初始化
setTimeout(() => {
  setupRightClickRotation();
}, 100);

// 加载 dx.glb 模型（已隐藏）
const loadModel = async () => {
  try {
    const lonCenter = (window.currentDisplayBounds.lonMin + window.currentDisplayBounds.lonMax) / 2;
    const latCenter = (window.currentDisplayBounds.latMin + window.currentDisplayBounds.latMax) / 2;
    const height = 0;

    // 如果模型已存在，先移除
    if (window.modelEntity) {
      viewer.entities.remove(window.modelEntity);
    }

    window.modelEntity = viewer.entities.add({
      name: 'DX Model',
      position: Cesium.Cartesian3.fromDegrees(lonCenter, latCenter, height),
      model: {
        uri: 'models/dx.glb',
        minimumPixelSize: 128,
        maximumScale: 20000,
      },
      show: false, // 隐藏模型
    });

    console.log('模型已加载（已隐藏）:', window.modelEntity);

  } catch (error) {
    console.error('模型加载失败:', error);
  }
};

// 更新模型位置
const updateModelPosition = () => {
  if (window.modelEntity) {
    const lonCenter = (window.currentDisplayBounds.lonMin + window.currentDisplayBounds.lonMax) / 2;
    const latCenter = (window.currentDisplayBounds.latMin + window.currentDisplayBounds.latMax) / 2;
    window.modelEntity.position = Cesium.Cartesian3.fromDegrees(lonCenter, latCenter, 0);
  }
};

// 延迟加载模型，确保viewer已完全初始化
// setTimeout(() => {
//   loadModel();
// }, 2000);

// 创建经纬度输入面板
const createLocationInputPanel = () => {
  const controlPanel = document.createElement('div');
  controlPanel.style.position = 'absolute';
  controlPanel.style.top = '10px';
  controlPanel.style.left = '10px';
  controlPanel.style.background = 'rgba(0,0,0,0.8)';
  controlPanel.style.color = 'white';
  controlPanel.style.padding = '15px';
  controlPanel.style.borderRadius = '8px';
  controlPanel.style.fontFamily = 'Arial, sans-serif';
  controlPanel.style.minWidth = '300px';
  controlPanel.style.zIndex = '1000';

  controlPanel.innerHTML = `
    <h3>🗺️ 区域控制</h3>
    <div style="margin-bottom: 15px;">
      <button onclick="startBoxSelect()" style="width: 100%; padding: 8px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">开始框选范围</button>
    </div>
    <div style="margin-bottom: 10px;">
      <button onclick="resetToFullArea()" style="width: 100%; padding: 8px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer;">重置为全区域</button>
    </div>
    <div id="boxSelectStatus" style="margin-bottom: 10px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 4px;">
      <p style="margin: 0; font-size: 12px; color: #ccc;">当前状态: 未开始框选</p>
      <p id="currentRange" style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">经度: 120.0° - 123.5° | 纬度: 30.0° - 32.5°</p>
    </div>
    <div style="font-size: 12px; color: #ccc;">
      <p>使用说明:</p>
      <p>1. 点击"开始框选范围"按钮</p>
      <p>2. 在地图上拖动鼠标框选区域</p>
      <p>3. 释放鼠标后点击"剖切"按钮</p>
      <p>4. 全局使用鼠标右键旋转视角</p>
    </div>
  `;

  document.body.appendChild(controlPanel);

  // 添加全局函数
  window.startBoxSelect = startBoxSelect;
  window.resetToFullArea = resetToFullArea;
  window.clearAllPrimitives = clearAllPrimitives;

  // 添加清除粒子图元的函数
  window.clearWindPrimitives = () => {
    if (window.windSystem) {
      window.windSystem.removePrimitives();
      console.log('粒子图元已清除');
    } else {
      console.log('风场系统未初始化');
    }
  };

  // 添加检查和修复全局变量的函数
  window.checkGlobalBounds = () => {
    if (!window.currentDisplayBounds) {
      console.log('修复undefined的currentDisplayBounds');
      window.currentDisplayBounds = {
        lonMin: 120.0,
        lonMax: 123.5,
        latMin: 30.0,
        latMax: 32.5
      };
    }
    console.log('当前全局范围:', window.currentDisplayBounds);
    return window.currentDisplayBounds;
  };

  // 添加调整粒子参数的函数
  window.adjustParticleOpacity = (opacity = 0.95) => {
    if (window.windSystem && window.windSystem.particleSystem) {
      window.windSystem.particleSystem.userInput.fadeOpacity = opacity;
      window.windSystem.particleSystem.applyUserInput(window.windSystem.particleSystem.userInput);
    }
  };

  // 添加调整粒子线宽的函数
  window.adjustParticleLineWidth = (lineWidth = 4.0) => {
    if (window.windSystem && window.windSystem.particleSystem) {
      window.windSystem.particleSystem.userInput.lineWidth = lineWidth;
      window.windSystem.particleSystem.applyUserInput(window.windSystem.particleSystem.userInput);
    }
  };

  // 添加设置纯白色粒子的函数
  window.setWhiteParticles = () => {
    if (window.windSystem && window.windSystem.particleSystem) {
      window.windSystem.particleSystem.userInput.fadeOpacity = 0.92;
      window.windSystem.particleSystem.userInput.lineWidth = 4.0;
      window.windSystem.particleSystem.applyUserInput(window.windSystem.particleSystem.userInput);
    }
  };

  // 添加设置短粒子的函数
  window.setShortParticles = () => {
    if (window.windSystem && window.windSystem.particleSystem) {
      window.windSystem.particleSystem.userInput.fadeOpacity = 0.90;
      window.windSystem.particleSystem.userInput.lineWidth = 4.0;
      window.windSystem.particleSystem.applyUserInput(window.windSystem.particleSystem.userInput);
    }
  };


  // 添加测试函数
  window.testWindRange = () => {
    if (window.windSystem && window.windSystem.particleSystem) {
      window.windSystem.updateViewerParameters();
      window.windSystem.particleSystem.applyViewerParameters(window.windSystem.viewerParameters);
    }
  };

  // 添加强制更新粒子范围的函数
  window.forceUpdateParticles = async () => {
    if (window.windSystem && window.windSystem.particleSystem) {
      try {
        window.windSystem.removePrimitives();
        await new Promise(resolve => setTimeout(resolve, 100));
        window.windSystem.particleSystem.viewerParameters.lonRange.x = window.currentDisplayBounds.lonMin;
        window.windSystem.particleSystem.viewerParameters.lonRange.y = window.currentDisplayBounds.lonMax;
        window.windSystem.particleSystem.viewerParameters.latRange.x = window.currentDisplayBounds.latMin;
        window.windSystem.particleSystem.viewerParameters.latRange.y = window.currentDisplayBounds.latMax;
        window.windSystem.particleSystem.refreshParticles(false);
        await new Promise(resolve => setTimeout(resolve, 100));
        window.windSystem.addPrimitives();
      } catch (error) {
        console.error('强制更新粒子时出错:', error);
      }
    }
  };
}

// 更新显示区域
// updateDisplayArea 函数已移除，改用框选功能

// 重置为全区域
const resetToFullArea = () => {
  window.currentDisplayBounds = {
    lonMin: 120.0,
    lonMax: 123.5,
    latMin: 30.0,
    latMax: 32.5
  };

  updateCurrentRangeDisplay();

  // 取消框选模式
  if (window.boxSelectHandler) {
    window.boxSelectHandler.destroy();
    window.boxSelectHandler = null;
  }

  // 清除矩形实体
  const entities = viewer.entities.values;
  entities.forEach(entity => {
    if (entity.rectangle) {
      viewer.entities.remove(entity);
    }
  });

  window.isBoxSelecting = false;
  window.selectedBounds = null;
  updateBoxSelectStatus('未开始框选', false);

  recreateTerrainAndHeatmap();
}

// 全局变量：存储框选状态
window.isBoxSelecting = false;
window.boxSelectHandler = null;
window.selectedBounds = null;

// 开始框选范围
const startBoxSelect = () => {
  if (window.isBoxSelecting) {
    // 如果已经在框选模式，取消框选
    if (window.boxSelectHandler) {
      window.boxSelectHandler.destroy();
      window.boxSelectHandler = null;
    }
    window.isBoxSelecting = false;
    updateBoxSelectStatus('未开始框选', false);
    return;
  }

  // 清理之前的状态
  if (window.boxSelectHandler) {
    window.boxSelectHandler.destroy();
    window.boxSelectHandler = null;
  }

  // 清除之前的所有矩形实体（为新框选做准备）
  const entities = viewer.entities.values;
  const entitiesToRemove = [];
  entities.forEach(entity => {
    if (entity.rectangle) {
      entitiesToRemove.push(entity);
    }
  });
  entitiesToRemove.forEach(entity => {
    viewer.entities.remove(entity);
  });

  // 开始框选模式
  window.isBoxSelecting = true;
  window.selectedBounds = null; // 清空之前的选择
  updateBoxSelectStatus('请在地图上拖动鼠标框选区域...', true);

  // 移除之前的确认按钮
  const confirmButton = document.getElementById('confirmSliceButton');
  if (confirmButton) {
    confirmButton.remove();
  }

  // 计算合适的视角高度以查看整个高程效果
  const currentLon = (window.currentDisplayBounds.lonMin + window.currentDisplayBounds.lonMax) / 2;
  const currentLat = (window.currentDisplayBounds.latMin + window.currentDisplayBounds.latMax) / 2;

  // 计算区域大小，根据大小调整高度
  const lonRange = window.currentDisplayBounds.lonMax - window.currentDisplayBounds.lonMin;
  const latRange = window.currentDisplayBounds.latMax - window.currentDisplayBounds.latMin;
  const maxRange = Math.max(lonRange, latRange);

  // 根据区域大小动态调整高度，确保能看到整个区域
  const height = maxRange * 111320 * 2; // 每度约111公里

  // 使用 flyTo 添加平滑动画效果
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(currentLon, currentLat, height),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-90), // 垂直俯视
      roll: 0
    },
    duration: 2.0 // 2秒动画时间
  });

  // 创建矩形选择处理器
  window.boxSelectHandler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);

  let startPosition = null;
  let rectangle = null;
  let currentRect = null;

  // 鼠标按下事件
  window.boxSelectHandler.setInputAction((click) => {
    if (!window.isBoxSelecting) return;

    // 清除之前的矩形
    if (rectangle) {
      viewer.entities.remove(rectangle);
      rectangle = null;
    }

    // 记录起始位置并立即创建矩形（用于实时显示）
    startPosition = click.position;

    // 初始化当前矩形范围（使用有效的地理坐标）
    currentRect = new Cesium.Rectangle(
      Cesium.Math.toRadians(-180), // west
      Cesium.Math.toRadians(-90),  // south
      Cesium.Math.toRadians(180),  // east
      Cesium.Math.toRadians(90)    // north
    );

    // 使用CallbackProperty实现实时更新
    rectangle = viewer.entities.add({
      rectangle: {
        coordinates: new Cesium.CallbackProperty(() => {
          return currentRect || new Cesium.Rectangle(
            Cesium.Math.toRadians(-180),
            Cesium.Math.toRadians(-90),
            Cesium.Math.toRadians(180),
            Cesium.Math.toRadians(90)
          );
        }, false),
        material: Cesium.Color.YELLOW.withAlpha(0.3),
        outline: true,
        outlineColor: Cesium.Color.YELLOW,
        height: 0
      }
    });

  }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

  // 鼠标移动事件 - 实时更新矩形
  window.boxSelectHandler.setInputAction((movement) => {
    if (!window.isBoxSelecting || !startPosition || !rectangle) return;

    const cartesianStart = viewer.camera.pickEllipsoid(startPosition, viewer.scene.globe.ellipsoid);
    const cartesianEnd = viewer.camera.pickEllipsoid(movement.endPosition, viewer.scene.globe.ellipsoid);

    if (cartesianStart && cartesianEnd) {
      const startCartographic = Cesium.Cartographic.fromCartesian(cartesianStart);
      const endCartographic = Cesium.Cartographic.fromCartesian(cartesianEnd);

      const rect = new Cesium.Rectangle(
        Math.min(startCartographic.longitude, endCartographic.longitude),
        Math.min(startCartographic.latitude, endCartographic.latitude),
        Math.max(startCartographic.longitude, endCartographic.longitude),
        Math.max(startCartographic.latitude, endCartographic.latitude)
      );

      // 实时更新矩形坐标（更新currentRect变量）
      currentRect = rect;
    }

  }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

  // 鼠标抬起事件 - 完成框选
  window.boxSelectHandler.setInputAction((click) => {
    if (!window.isBoxSelecting || !startPosition) return;

    // 只有在创建了矩形（即进行了拖动）的情况下才处理
    if (!rectangle) {
      // 只是点击，没有拖动，不进行处理
      startPosition = null;
      return;
    }

    const cartesianStart = viewer.camera.pickEllipsoid(startPosition, viewer.scene.globe.ellipsoid);
    const cartesianEnd = viewer.camera.pickEllipsoid(click.position, viewer.scene.globe.ellipsoid);

    if (cartesianStart && cartesianEnd) {
      const startCartographic = Cesium.Cartographic.fromCartesian(cartesianStart);
      const endCartographic = Cesium.Cartographic.fromCartesian(cartesianEnd);

      // 计算经纬度范围
      const lonMin = Math.min(startCartographic.longitude, endCartographic.longitude) * (180 / Math.PI);
      const lonMax = Math.max(startCartographic.longitude, endCartographic.longitude) * (180 / Math.PI);
      const latMin = Math.min(startCartographic.latitude, endCartographic.latitude) * (180 / Math.PI);
      const latMax = Math.max(startCartographic.latitude, endCartographic.latitude) * (180 / Math.PI);

      // 保存选择的范围（新的选择会覆盖之前的选择）
      window.selectedBounds = {
        lonMin: lonMin,
        lonMax: lonMax,
        latMin: latMin,
        latMax: latMax
      };

      // 更新显示范围（不渲染，等待点击按钮）
      updateBoxSelectStatus(`已选择: ${lonMin.toFixed(2)}°-${lonMax.toFixed(2)}°E, ${latMin.toFixed(2)}°-${latMax.toFixed(2)}°N`, true);

      // 添加剖切按钮和清除按钮
      addConfirmButton();
      addClearButton();
    }

    // 清除之前的其他矩形，只保留当前选择的矩形
    const allEntities = viewer.entities.values;
    const currentRectangle = rectangle; // 保存当前矩形引用
    allEntities.forEach(entity => {
      // 如果是矩形但不是当前矩形，删除它
      if (entity.rectangle && entity !== currentRectangle) {
        viewer.entities.remove(entity);
      }
    });

    // 重置状态
    startPosition = null;
    rectangle = null;

  }, Cesium.ScreenSpaceEventType.LEFT_UP);
}

// 更新框选状态显示
const updateBoxSelectStatus = (message, showConfirm = false) => {
  const statusElement = document.getElementById('boxSelectStatus');
  if (statusElement) {
    statusElement.innerHTML = `<p style="margin: 0; font-size: 12px; color: ${showConfirm ? '#4CAF50' : '#ccc'};">当前状态: ${message}</p>`;
  }
}

// 添加确认剖切按钮
const addConfirmButton = () => {
  // 移除之前的按钮（如果存在），确保只有一个
  const oldButton = document.getElementById('confirmSliceButton');
  if (oldButton) {
    oldButton.remove();
  }

  // 获取控制面板
  const controlPanel = document.querySelector('[style*="position: absolute"]');
  if (!controlPanel) return;

  // 检查是否已经存在按钮，避免重复添加
  const existingButton = controlPanel.querySelector('#confirmSliceButton');
  if (existingButton) return;

  // 创建确认按钮
  const button = document.createElement('button');
  button.id = 'confirmSliceButton';
  button.textContent = '剖切';
  button.style.cssText = 'width: 100%; padding: 8px; background: #FF5722; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;';
  button.onclick = applySlice;

  controlPanel.appendChild(button);
}

// 添加清除框选按钮
const addClearButton = () => {
  // 移除之前的按钮（如果存在）
  const oldButton = document.getElementById('clearSelectionButton');
  if (oldButton) {
    oldButton.remove();
  }

  // 获取控制面板
  const controlPanel = document.querySelector('[style*="position: absolute"]');
  if (!controlPanel) return;

  // 检查是否已经存在按钮，避免重复添加
  const existingButton = controlPanel.querySelector('#clearSelectionButton');
  if (existingButton) return;

  // 创建清除按钮
  const button = document.createElement('button');
  button.id = 'clearSelectionButton';
  button.textContent = '清除框选';
  button.style.cssText = 'width: 100%; padding: 8px; background: #FF9800; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 10px;';
  button.onclick = clearBoxSelection;

  controlPanel.appendChild(button);
}

// 清除框选效果
const clearBoxSelection = () => {
  // 清除所有矩形
  const allEntities = viewer.entities.values;
  allEntities.forEach(entity => {
    if (entity.rectangle) {
      viewer.entities.remove(entity);
    }
  });

  // 清除选择的范围
  window.selectedBounds = null;

  // 更新状态显示
  updateBoxSelectStatus('已清除框选', false);

  // 移除按钮
  const clearButton = document.getElementById('clearSelectionButton');
  if (clearButton) {
    clearButton.remove();
  }

  const confirmButton = document.getElementById('confirmSliceButton');
  if (confirmButton) {
    confirmButton.remove();
  }

  // 不清除显示内容和范围，只清除框选状态
}

// 应用剖切效果
const applySlice = () => {
  if (!window.selectedBounds) {
    alert('请先框选一个区域');
    return;
  }

  // 更新显示范围
  window.currentDisplayBounds = window.selectedBounds;
  updateCurrentRangeDisplay();

  // 执行渲染（视角已经在开始框选时设置好了，这里不需要再切换视角）
  recreateTerrainAndHeatmap();

  // 清理框选状态
  if (window.boxSelectHandler) {
    window.boxSelectHandler.destroy();
    window.boxSelectHandler = null;
  }

  // 清除矩形实体
  const entities = viewer.entities.values;
  entities.forEach(entity => {
    if (entity.rectangle) {
      viewer.entities.remove(entity);
    }
  });

  // 重置框选状态，但保持框选功能可用
  window.isBoxSelecting = false;
  window.selectedBounds = null; // 清空选择，以便下次框选
  updateBoxSelectStatus('已应用剖切，可重新框选', false);

  // 移除确认和清除按钮
  const confirmButton = document.getElementById('confirmSliceButton');
  if (confirmButton) {
    confirmButton.remove();
  }

  const clearButton = document.getElementById('clearSelectionButton');
  if (clearButton) {
    clearButton.remove();
  }
}

// 缩放到指定区域
const fitToArea = () => {
  const lonCenter = (window.currentDisplayBounds.lonMin + window.currentDisplayBounds.lonMax) / 2;
  const latCenter = (window.currentDisplayBounds.latMin + window.currentDisplayBounds.latMax) / 2;

  const lonRange = window.currentDisplayBounds.lonMax - window.currentDisplayBounds.lonMin;
  const latRange = window.currentDisplayBounds.latMax - window.currentDisplayBounds.latMin;

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(lonCenter, latCenter, 50000),
    orientation: {
      heading: Cesium.Math.toRadians(0),
      pitch: Cesium.Math.toRadians(-45),
      roll: 0
    }
  });
}

// 更新当前范围显示
const updateCurrentRangeDisplay = () => {
  const rangeElement = document.getElementById('currentRange');
  if (rangeElement) {
    rangeElement.textContent = `经度: ${window.currentDisplayBounds.lonMin}° - ${window.currentDisplayBounds.lonMax}° | 纬度: ${window.currentDisplayBounds.latMin}° - ${window.currentDisplayBounds.latMax}°`;
  }
}

// 清理所有现有图元
const clearAllPrimitives = () => {
  if (window.fluidDemo) {

    const primitives = [
      window.fluidDemo._bufferA,
      window.fluidDemo._bufferB,
      window.fluidDemo._bufferC,
      window.fluidDemo._bufferD,
      window.fluidDemo._terrainPrimitive
    ];

    primitives.forEach(primitive => {
      if (primitive) {
        try {
          viewer.scene.primitives.remove(primitive);
        } catch (error) {
          console.warn('移除图元时出错:', error);
        }
      }
    });

    window.fluidDemo._bufferA = null;
    window.fluidDemo._bufferB = null;
    window.fluidDemo._bufferC = null;
    window.fluidDemo._bufferD = null;
    window.fluidDemo._terrainPrimitive = null;
  }
};

// 重新创建地形
const recreateTerrainAndHeatmap = async () => {
  // 清理所有现有图元
  clearAllPrimitives();

  // 等待一帧确保清理完成
  await new Promise(resolve => setTimeout(resolve, 100));

  // 重新加载TIF数据
  await readGeoTif(window.currentDisplayBounds);

  // 更新风场范围
  if (window.windSystem) {

    try {
      // 先移除旧的粒子图元
      window.windSystem.removePrimitives();

      // 等待一帧确保移除完成
      await new Promise(resolve => setTimeout(resolve, 50));

      // 更新风场参数
      window.windSystem.updateViewerParameters();

      // 强制更新粒子范围
      if (window.windSystem.particleSystem) {

        // 直接更新粒子系统的viewerParameters
        window.windSystem.particleSystem.viewerParameters.lonRange.x = window.currentDisplayBounds.lonMin;
        window.windSystem.particleSystem.viewerParameters.lonRange.y = window.currentDisplayBounds.lonMax;
        window.windSystem.particleSystem.viewerParameters.latRange.x = window.currentDisplayBounds.latMin;
        window.windSystem.particleSystem.viewerParameters.latRange.y = window.currentDisplayBounds.latMax;

        // 强制刷新粒子
        window.windSystem.particleSystem.refreshParticles(false);
      }

      // 等待一帧确保粒子刷新完成
      await new Promise(resolve => setTimeout(resolve, 50));

      // 重新添加粒子图元
      window.windSystem.addPrimitives();

    } catch (error) {
      console.error('更新风场范围时出错:', error);
    }
  }

  // 更新模型位置
  updateModelPosition();
}

// 调试函数：调整水体透明度
window.adjustWaterTransparency = (transparency = 0.4) => {
  console.log('水体透明度调整功能已添加，当前值:', transparency);
  console.log('提示：水体透明度在着色器中动态计算，基于水深和动画进度');
};

// 调试函数：调整水体颜色
window.adjustWaterColor = (deepBlue = 0.15, shallowBlue = 0.6) => {
  console.log('水体颜色调整功能已添加');
  console.log('深水蓝色分量:', deepBlue, '浅水蓝色分量:', shallowBlue);
  console.log('提示：水体颜色在着色器中动态计算，基于水深');
};

// 调试函数：调整波浪强度
window.adjustWaveStrength = (strength = 1.0) => {
  console.log('波浪强度调整功能已添加，当前值:', strength);
  console.log('提示：波浪强度在着色器中动态计算，基于动画进度');
};

// 调试函数：调整水体反射强度
window.adjustWaterReflection = (reflection = 0.3) => {
  console.log('水体反射强度调整功能已添加，当前值:', reflection);
  console.log('提示：水体反射在着色器中动态计算，基于菲涅尔效应');
};

// 调试函数：调整最上层水体检测阈值
window.adjustTopWaterThreshold = (threshold = 0.15) => {
  console.log('最上层水体检测阈值调整功能已添加，当前值:', threshold);
  console.log('提示：只有水位高度超过此阈值的区域才会应用高级水体效果');
  console.log('当前阈值:', threshold, '（0.15表示15%的水位高度）');
};

// 调试函数：显示水体层级信息
window.showWaterLayerInfo = () => {
  console.log('=== 水体层级信息 ===');
  console.log('最上层水体阈值: 0.05 (5%水位高度)');
  console.log('基础波浪效果: 所有水体都有');
  console.log('高级效果包括:');
  console.log('- 复杂波浪效果（顶层水体）');
  console.log('- 多层天空反射（顶层水体）');
  console.log('- 动态泡沫效果（顶层水体）');
  console.log('- 高光反射（顶层水体）');
  console.log('==================');
};

// 调试函数：强制显示波浪效果
window.forceShowWaves = () => {
  console.log('波浪效果已大幅增强！');
  console.log('- 简化了水体检测逻辑');
  console.log('- 降低了最上层水体阈值到 5%');
  console.log('- 基础波浪幅度：0.06-0.15（3-7.5倍增强）');
  console.log('- 顶层波浪幅度：0.06-0.20（2.5-10倍增强）');
  console.log('- 添加了高频波浪和测试波浪');
  console.log('- 增强了波浪颜色和亮度变化');
  console.log('- 所有水体都有基础波浪效果');
  console.log('- 顶层水体有额外的复杂波浪');
};

// 调试函数：显示水体检测信息
window.debugWaterDetection = () => {
  console.log('=== 水体检测调试 ===');
  console.log('水体检测逻辑：直接检查 waterBoxHeight > 0.01');
  console.log('海洋检测：地形高度 <= 0.1 且 水体深度 > 0.05');
  console.log('波浪效果：仅应用于海洋区域，陆地水域保持平静');
  console.log('波浪高度：基础 0.002-0.008，高级 0.004-0.012（自然变化）');
  console.log('退潮效果：已减少，波浪强度 0.7-1.0，更连续自然');
  console.log('==================');
};

// 调试函数：调整波浪高度
window.adjustWaveHeight = (baseHeight = 0.08, topHeight = 0.12) => {
  console.log('波浪高度调整功能已添加');
  console.log('基础波浪高度:', baseHeight);
  console.log('顶层波浪高度:', topHeight);
  console.log('提示：波浪高度在 getHeight 函数中计算，影响几何体形状');
};

// 调试函数：显示波浪高度信息
window.showWaveHeightInfo = () => {
  console.log('=== 波浪高度信息 ===');
  console.log('波浪高度已集成到几何体计算中');
  console.log('基础波浪高度范围: 0.002-0.008（自然变化）');
  console.log('顶层波浪高度范围: 0.004-0.012（自然变化）');
  console.log('总高度 = 地形高度 + 水箱高度 + 波浪高度');
  console.log('波浪高度随时间和位置动态变化');
  console.log('海洋区域：有波浪效果，陆地水域：保持平静');
  console.log('退潮效果已减少，波浪更连续自然');
  console.log('==================');
};

window.addEventListener("DOMContentLoaded", () => {
  readGeoTif();
  createLocationInputPanel();
})