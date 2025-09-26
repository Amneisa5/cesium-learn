Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMDg0MzI2Ni0wMGI3LTQyOTYtOGM1Zi1iMTE4OTkxMTgyYzciLCJpZCI6MTc1MDE3LCJpYXQiOjE3NTQ5ODAxMTd9.Id_Wy_2_BUC537hz_sZlLTVbQ4i93qGgcR-Ro7X7qXA'
let textureData;
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
const lonLatBounds = { lonMin: 120, lonMax: 123.5, latMin: 30, latMax: 32.5 }

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
const Command = `
  const int textureSize = 256;
  const int textureWidth = 840;
  const int textureHeight = 600;
  const float lonMin = 120.0;
  const float lonMax = 123.5;
  const float latMin = 30;
  const float latMax = 32.5;
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
 float res = mix(mix(hash13(vec3(fl, z)), hash13(vec3(fl + vec2(1,0), z)),fr.x),
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
 p = clamp(p, ivec2(0), ivec2(textureHeight - 1));
 return texelFetch(iChannel0, p, 0).xy;
}

vec4 readOutFlow(ivec2 p)
{
 if(p.x < 0 || p.y < 0 || p.x >= textureWidth || p.y >= textureHeight)
   return vec4(0);
 return texelFetch(iChannel1, p, 0);
}

void main( )
{
  // Outside ?
  if( gl_FragCoord.x > float(textureWidth)  || gl_FragCoord.y > float(textureHeight))
    discard;

  // Terrain
  float lon = lonMin + v_st.x*(lonMax-lonMin);
  float lat = latMin + v_st.y*(latMax-latMin);
  vec2 uv = vec2((lon-lonMin)/(lonMax-lonMin), (lat-latMin)/(latMax-latMin));
  float t = iTime / transitionTime;
  float terrainElevation = mix(Terrain(uv * 4.0, floor(t), octaves), Terrain(uv * 4.0, floor(t) + 1.0, octaves), smoothstep(1.0 - transitionPercent, 1.0, fract(t))) * 0.5;
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
uniform float   iTime;
uniform int   iFrame;
vec2 readHeight(ivec2 p)
{
 p = clamp(p, ivec2(0), ivec2(textureSize - 1));
 return texelFetch(iChannel0, p, 0).xy;
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
 if( max(p.x, p.y) > textureSize )
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
uniform float   iTime;
uniform int   iFrame;
vec2 readHeight(ivec2 p)
{
 p = clamp(p, ivec2(0), ivec2(textureSize - 1));
 return texelFetch(iChannel0, p, 0).xy;
}

vec4 readOutFlow(ivec2 p)
{
 if(p.x < 0 || p.y < 0 || p.x >= textureSize || p.y >= textureSize)
   return vec4(0);
 return texelFetch(iChannel1, p, 0);
}

void main( )
{
 // Outside ?
 if( max(gl_FragCoord.x, gl_FragCoord.y) > float(textureSize) )
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
uniform float   iTime;
uniform int   iFrame;
vec2 readHeight(ivec2 p)
{
 p = clamp(p, ivec2(0), ivec2(textureSize - 1));
 return texelFetch(iChannel0, p, 0).xy;
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
 if( max(p.x, p.y) > textureSize )
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
 p = (p + 1.0) * 0.5;
 vec2 p2 = p.xz * vec2(float(textureSize)) / iResolution.xy;
 p2 = min(p2, vec2(float(textureSize) - 0.5) / iResolution.xy);
 vec2 h = texture(iChannel0, p2).xy;
 h.y += h.x;
 return h - boxHeight;
}

vec3 getNormal(in vec3 p, int comp)
{
 float d = 2.0 / float(textureSize);
 float hMid = getHeight(p)[comp];
 float hRight = getHeight(p + vec3(d, 0, 0))[comp];
 float hTop = getHeight(p + vec3(0, 0, d))[comp];
 return normalize(cross(vec3(0, hTop - hMid, d), vec3(d, hRight - hMid, 0)));
}

vec3 terrainColor(in vec3 p, in vec3 n, out float spec)
{
 spec = 0.1;
 vec3 c = vec3(0.21, 0.50, 0.07);
 float cliff = smoothstep(0.8, 0.3, n.y);
 c = mix(c, vec3(0.25), cliff);
 spec = mix(spec, 0.3, cliff);
 float snow = smoothstep(0.05, 0.25, p.y) * smoothstep(0.5, 0.7, n.y);
 c = mix(c, vec3(0.95, 0.95, 0.85), snow);
 spec = mix(spec, 0.4, snow);
 vec3 t = texture(iChannel1, p.xz * 5.0).xyz;
 return mix(c, c * t, 0.75);
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
  _resolution;
  constructor(viewer, width = 840, height = 600, lonLatBounds = { lonMin: 120, lonMax: 123.5, latMin: 30, latMax: 32.5 }) {
    this._viewer = viewer;

    // 分辨率
    this._width = width;
    this._height = height;

    this._resolution = new Cesium.Cartesian2(this._width, this._height);
    this._lonLatBounds = lonLatBounds;
    this.initShaderToy();
  }
  initShaderToy () {
    console.log(this._height, this._width);
    const texA = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._width,
      height: this._height,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._width * this._height * 4),
    });
    const texB = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._width,
      height: this._height,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._width * this._height * 4),
    });
    const texC = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._width,
      height: this._height,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._width * this._height * 4),
    });
    const texD = RenderUtil.createTexture({
      context: this._viewer.scene.context,
      width: this._width,
      height: this._height,
      pixelFormat: Cesium.PixelFormat.RGBA,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      arrayBufferView: new Float32Array(this._width * this._height * 4),
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
          return texC;
        },
        iChannel1: () => {
          return texD;
        },
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [Command, BufferA],
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
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [Command, BufferB],
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
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [Command, BufferC],
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
      },
      fragmentShaderSource: new Cesium.ShaderSource({
        sources: [Command, BufferD],
      }),
      geometry: quadGeometry,
      outputTexture: texD,
      preExecute: function () {
        Buffer_D.commandToExecute.outputTexture = texD;
      },
    });

    // Render Box
    let terrainMap = this._viewer.scene.frameState.context.defaultTexture;
    Cesium.Resource.fetchImage({
      url: 'http://127.0.0.1:63455/terrain.jpg',
    }).then((image) => {
      terrainMap = new Cesium.Texture({
        context: this._viewer.scene.frameState.context,
        source: image,
        sampler: new Cesium.Sampler({
          wrapS: Cesium.TextureWrap.REPEAT,
          wrapT: Cesium.TextureWrap.REPEAT,
          magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
          minificationFilter:
            Cesium.TextureMinificationFilter.LINEAR_MIPMAP_LINEAR,
        }),
      });
      terrainMap.generateMipmap();
    });

    // Render Command
    const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(
        (this._lonLatBounds.lonMin + this._lonLatBounds.lonMax) / 2,
        (this._lonLatBounds.latMin + this._lonLatBounds.latMax) / 2,
        0
      )
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
          return terrainMap;
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
        sources: [Command + renderShaderSource],
      }),
    });

    // Render Event
    let time = 1.0;
    let frame = 0;
    // this._viewer.scene.postRender.addEventListener(() => {
    //   const now = performance.now();
    //   time = now / 1000;
    //   frame += 0.02;
    // });

    this._viewer.scene.primitives.add(Buffer_A);
    this._viewer.scene.primitives.add(Buffer_B);
    this._viewer.scene.primitives.add(Buffer_C);
    this._viewer.scene.primitives.add(Buffer_D);
    this._viewer.scene.primitives.add(fluidCommand);
  }
};
// viewer.camera.lookAt(boxCenter, new Cesium.Cartesian3(0.0, -10000.0, 5000.0));
const readGeoTif = async () => {
  const terrain = "http://127.0.0.1:63455/water/gebco_2023_n32.5_s30.0_w120.0_e123.5.tif";
  const rawTiff = await GeoTIFF.fromUrl(terrain);
  const tifImage = await rawTiff.getImage();
  const width = tifImage.getWidth();
  const height = tifImage.getHeight();
  textureData = new Float32Array(width * height * 4);
  const data = await tifImage.readRasters({ interleave: true });
  for (let i = 0; i < width * height; i++) {
    textureData[i * 4] = data[i];      // 高度
    textureData[i * 4 + 1] = 0;
    textureData[i * 4 + 2] = 0;
    textureData[i * 4 + 3] = 1;
  }
  // const vertices = [];
  // const uvs = [];
  // const indices = [];

  // const heights = []
  // const lats = [];
  // const lons = [];
  // const lonMin = 120, lonMax = 123.5;
  // const latMin = 30, latMax = 32.5;
  // // 顶点坐标 + UV
  // for (let y = 0; y < height; y++) {
  //   for (let x = 0; x < width; x++) {
  //     const index = y * width + x;
  //     const lon = lonMin + (x / (width - 1)) * (lonMax - lonMin);
  //     const lat = latMin + (y / (height - 1)) * (latMax - latMin);
  //     const h = data[index] * 50;
  //     heights.push(h);
  //     // 经纬度转世界笛卡尔坐标
  //     const cartesian = Cesium.Cartesian3.fromDegrees(lon, lat, h);
  //     vertices.push(cartesian.x, cartesian.y, cartesian.z);
  //     lats.push(lat);
  //     lons.push(lon);
  //     uvs.push(x / (width - 1), y / (height - 1));
  //   }
  // }

  // // 三角形索引
  // for (let y = 0; y < height - 1; y++) {
  //   for (let x = 0; x < width - 1; x++) {
  //     const a = y * width + x;
  //     const b = a + 1;
  //     const c = (y + 1) * width + x;
  //     const d = c + 1;

  //     indices.push(a, b, c);
  //     indices.push(b, d, c);
  //   }
  // }

  // // 创建 Geometry（用 let，因为后面要重新赋值）
  // let geometry = new Cesium.Geometry({
  //   attributes: {
  //     // 笛卡尔积坐标
  //     position: new Cesium.GeometryAttribute({
  //       componentDatatype: Cesium.ComponentDatatype.DOUBLE, // 必须 DOUBLE
  //       componentsPerAttribute: 3,
  //       values: new Float64Array(vertices),
  //     }),
  //     // 纹理坐标，告诉渲染器如何映射纹理
  //     st: new Cesium.GeometryAttribute({
  //       componentDatatype: Cesium.ComponentDatatype.FLOAT,
  //       componentsPerAttribute: 2,
  //       values: new Float32Array(uvs),
  //     }),
  //   },
  //   // 三角点坐标
  //   indices: new Uint32Array(indices),
  //   primitiveType: Cesium.PrimitiveType.TRIANGLES,
  //   boundingSphere: Cesium.BoundingSphere.fromVertices(new Float64Array(vertices)),
  // });

  // const originalPositions = geometry.attributes.position.values;
  // // 检查 position 属性
  // if (!geometry.attributes.position) {
  //   throw new Error("position attribute missing in geometry");
  // }

  // 生成 position3DHigh / position3DLow
  // geometry = Cesium.GeometryPipeline.encodeAttribute(
  //   geometry,
  //   "position",
  //   "position3DHigh",
  //   "position3DLow"
  // );
  // geometry.attributes.position = new Cesium.GeometryAttribute({
  //   componentDatatype: Cesium.ComponentDatatype.DOUBLE,
  //   componentsPerAttribute: 3,
  //   values: originalPositions,
  // });
  // 材质
  // const material = new Cesium.Material({
  //   fabric: {
  //     type: "Color",
  //     uniforms: {
  //       color: Cesium.Color.WHITE.withAlpha(0.8) // 这里换成你需要的颜色
  //     }
  //   }
  // });

  // // 创建 Primitive
  // const terrainPrimitive = new Cesium.Primitive({
  //   geometryInstances: new Cesium.GeometryInstance({
  //     geometry: geometry,
  //   }),
  //   appearance: new Cesium.MaterialAppearance({
  //     material: material,
  //     vertexFormat: Cesium.VertexFormat.ALL,
  //   }),
  //   asynchronous: false,
  // });

  // viewer.scene.primitives.add(terrainPrimitive);

  // 添加流体
  const fluid = new FluidDemo(viewer, width, height, { lonMin: 120, lonMax: 123.5, latMin: 30, latMax: 32.5 });
}

window.addEventListener("DOMContentLoaded", () => {
  readGeoTif();
})