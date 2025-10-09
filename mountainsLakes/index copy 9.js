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
  const vec3 backgroundColor = vec3(0.2);
  // Terrain
  const float transitionTime = 5.0;
  const float transitionPercent = 0.3;
  const int octaves = 7;
  // Water simulation
  const float attenuation = 0.995;
  const float strenght = 0.25;
  const float minTotalFlow = 0.0001;
  const float initialWaterLevel = 0.05;
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
 float terrainH = texelFetch(heightMap, p, 0).r;
 float waterH = initialWaterLevel;
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
 float terrainH = texelFetch(heightMap, p, 0).r;
 float waterH = initialWaterLevel;
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
 float terrainH = texelFetch(heightMap, p, 0).r;
 float waterH = initialWaterLevel;
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
 float terrainH = texelFetch(heightMap, p, 0).r;
 float waterH = initialWaterLevel;
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
in vec3 vo;
in vec3 vd;
in vec2 v_st;
const vec3 light = vec3(0.,4.,2.);
const float boxHeight = 0.45;
vec2 getHeight(in vec3 p)
{
 // Cesium BoxGeometry 的坐标范围是 [-0.5, 0.5]
 // 需要变换到 [0, 1] 的UV坐标范围
 vec2 uv = (p.xz + 0.5);
 // 确保UV坐标在有效范围内
 uv = clamp(uv, 0.0, 1.0);
 vec2 h = texture(iChannel0, uv).xy;
 h.y += h.x;
 return h - boxHeight;
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
 
 // 用程序化渐变（沙滩-草地-岩石-积雪）
 vec3 c1 = vec3(0.90, 0.85, 0.70); // 低海拔沙色
 vec3 c2 = vec3(0.20, 0.55, 0.25); // 草地绿
 vec3 c3 = vec3(0.45, 0.40, 0.35); // 岩石棕
 vec3 c4 = vec3(0.95, 0.95, 0.98); // 积雪白
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
 
 // 添加纹理细节 - 使用TIF高度纹理作为细节纹理
 vec3 t = texture(iChannel1, p.xz * 5.0).xyz;
 ramp = mix(ramp, ramp * t, 0.2); // 减少纹理混合强度
 
 return ramp;
}

vec3 undergroundColor(float d)
{
 vec3 color[4] = vec3[](vec3(0.5, 0.45, 0.5), vec3(0.40, 0.35, 0.25), vec3(0.55, 0.50, 0.4), vec3(0.45, 0.30, 0.20));
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
     tc = tc * (max( 0.0, dot(lightDir, tn)) + 0.3);
     spec *= pow(max(0., dot(lightDir, reflect(rd, tn))), 10.0);
     tc += spec;
   }
   if(tt > ret.y) {
     tc = vec3(0, 0, 0.4);
   }
   float wt = ret.x;
   h = getHeight(pi);
   vec3 waterNormal;
   if(pi.y < h.y) {
     waterNormal = n;
   }
   else {
     for (int i = 0; i < 80; i++) {
       vec3 p = ro + rd * wt;
       float h = p.y - getHeight(p).y;
       if (h < 0.0002 || wt > min(tt, ret.y))
       break;
       wt += h * 0.4;
     }
     waterNormal = getNormal(ro + rd * wt, 1);
   }
   if(wt < ret.y) {
     float dist = (min(tt, ret.y) - wt);
     vec3 p = waterNormal;
     vec3 lightDir = normalize(light - (ro + rd * wt));
     tc = applyFog( tc, vec3(0, 0, 0.4), dist * 15.0);
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

    this.initShaderToy();
  }
  initShaderToy () {
    // 动态设置textureSize，使用较大的尺寸作为着色器网格
    const dynamicCommand = Command.replace(
      `const int textureWidth = ${this._textureWidth};\nconst int textureHeight = ${this._textureHeight};`
    );
    console.log(this._textureData)
    // 创建独立的TIF高度纹理（只读）
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
    console.log("TIF高度纹理:", tifHeightTexture)
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
    console.log("流体数据纹理:", texA)
    console.log("流体数据纹理:", texB)
    console.log("流体数据纹理:", texC)
    console.log("流体数据纹理:", texD)
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

    // Render Box
    // let terrainMap = this._viewer.scene.frameState.context.defaultTexture;
    // Cesium.Resource.fetchImage({
    //   url: 'terrain.jpg',
    // }).then((image) => {
    //   terrainMap = new Cesium.Texture({
    //     context: this._viewer.scene.frameState.context,
    //     source: image,
    //     sampler: new Cesium.Sampler({
    //       wrapS: Cesium.TextureWrap.REPEAT,
    //       wrapT: Cesium.TextureWrap.REPEAT,
    //       magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
    //       minificationFilter:
    //         Cesium.TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
    //     }),
    //   });
    //   terrainMap.generateMipmap();
    // });

    // Render Command - 根据TIF文件的地理范围调整几何体尺寸
    // 计算地理范围的实际距离
    const lonRange = this._lonLatBounds.lonMax - this._lonLatBounds.lonMin; // 123.5 - 120 = 3.5度
    const latRange = this._lonLatBounds.latMax - this._lonLatBounds.latMin; // 32.5 - 30 = 2.5度

    // 根据TIF文件的实际尺寸比例计算几何体尺寸
    const tifAspectRatio = this._width / this._height; // 840/600 = 1.4
    const baseScale = 2000; // 基础缩放因子
    const width = baseScale * tifAspectRatio; // 2000 * 1.4 = 2800
    const height = baseScale; // 2000
    const depth = 1700; // 保持深度不变

    // 计算TIF文件的地理中心点
    const lonCenter = (this._lonLatBounds.lonMin + this._lonLatBounds.lonMax) / 2; // (120 + 123.5) / 2 = 121.75
    const latCenter = (this._lonLatBounds.latMin + this._lonLatBounds.latMax) / 2; // (30 + 32.5) / 2 = 31.25

    console.log("地理范围:", this._lonLatBounds.lonMin, "-", this._lonLatBounds.lonMax, "°E,",
      this._lonLatBounds.latMin, "-", this._lonLatBounds.latMax, "°N");
    console.log("地理跨度:", lonRange, "°经度,", latRange, "°纬度");
    console.log("TIF文件尺寸:", this._width, "x", this._height);
    console.log("TIF宽高比:", tifAspectRatio);
    console.log("几何体尺寸:", width, "x", height, "x", depth);
    console.log("地理中心点:", lonCenter, "°E,", latCenter, "°N");
    console.log("iResolution:", this._resolution.x, "x", this._resolution.y);
    console.log("terrainWidth:", this._textureWidth, "terrainHeight:", this._textureHeight);
    console.log("动态替换后的Command片段:", dynamicCommand.substring(0, 200));

    const modelMatrix = generateModelMatrix(
      [lonCenter, latCenter, 300], // 使用TIF文件的地理中心点
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
    });

    this._viewer.scene.primitives.add(Buffer_A);
    this._viewer.scene.primitives.add(Buffer_B);
    this._viewer.scene.primitives.add(Buffer_C);
    this._viewer.scene.primitives.add(Buffer_D);
    this._viewer.scene.primitives.add(fluidCommand);
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
const readGeoTif = async () => {
  const terrain = "gebco_2023_n32.5_s30.0_w120.0_e123.5.tif";
  const rawTiff = await GeoTIFF.fromUrl(terrain);
  const tifImage = await rawTiff.getImage();
  const tifWidth = tifImage.getWidth();
  const tifHeight = tifImage.getHeight();
  console.log("TIF尺寸:", tifWidth, "x", tifHeight);

  // 使用TIF的真实尺寸
  console.log("使用TIF真实尺寸:", tifWidth, "x", tifHeight);

  // 读取TIF数据
  const tifData = await tifImage.readRasters({ interleave: true });

  // 直接使用TIF数据，不进行采样
  textureData = new Float32Array(tifWidth * tifHeight * 4);

  // 计算高度范围用于归一化
  let minHeight = tifData[0];
  let maxHeight = tifData[0];
  for (let i = 1; i < tifData.length; i++) {
    if (tifData[i] < minHeight) minHeight = tifData[i];
    if (tifData[i] > maxHeight) maxHeight = tifData[i];
  }
  console.log("TIF高度范围:", minHeight, "到", maxHeight, "米");

  // 直接使用TIF数据，从底部开始读取以匹配GLSL坐标系统
  for (let y = 0; y < tifHeight; y++) {
    for (let x = 0; x < tifWidth; x++) {
      // 从底部开始读取，匹配GLSL的UV坐标系统
      const tifIndex = (tifHeight - 1 - y) * tifWidth + x;

      // 获取原始高度值
      const rawHeight = tifData[tifIndex];

      // 归一化到0-1范围
      const normalizedHeight = (rawHeight - minHeight) / (maxHeight - minHeight);

      const index = (y * tifWidth + x) * 4;
      textureData[index] = normalizedHeight;     // 归一化高度
      textureData[index + 1] = 0;               // 初始水位
      textureData[index + 2] = 0;               // 未使用
      textureData[index + 3] = 1;               // Alpha
    }
  }

  console.log("TIF数据已直接使用，从底部开始读取以匹配GLSL坐标系统");

  // 暂时不创建3D地形几何体，只使用TIF数据作为高度纹理
  console.log("跳过3D地形创建，使用TIF数据作为高度纹理");
  console.log(textureData)
  console.log("TIF尺寸:", tifWidth, "x", tifHeight)
  // 添加流体系统，使用TIF真实尺寸
  const fluid = new FluidDemo(viewer, tifWidth, tifHeight, textureData, { lonMin: 120, lonMax: 123.5, latMin: 30, latMax: 32.5 });
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
    terrain: undefined,
    // 不加载地球底图
    imageryProvider: false,
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