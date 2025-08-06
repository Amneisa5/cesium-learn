
Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkYWNmOTc1NC02N2U0LTQzZGMtOGRhNC1lOTJjNjFiMWIzZjgiLCJpZCI6MTMzMzE0LCJpYXQiOjE3MTM4NDk4NzJ9.uIiDvn99Slv79KZrGoMizfV3hGvuWNZq3c_50IRXE-c'

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
    }
  });
viewer.scene.logarithmicDepthBuffer = true;
var Check = Cesium.Check;
var createGuid = Cesium.createGuid;
var defaultValue = Cesium.defaultValue;
var defined = Cesium.defined;
var destroyObject = Cesium.destroyObject;
var DeveloperError = Cesium.DeveloperError;
var PixelFormat = Cesium.PixelFormat;
var ContextLimits = Cesium.ContextLimits;
var PixelDatatype = Cesium.PixelDatatype;
var Sampler = Cesium.Sampler;
var Cartesian3 = Cesium.Cartesian3;

const _p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10,
  23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87,
  174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211,
  133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208,
  89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5,
  202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119,
  248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232,
  178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249,
  14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205,
  93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180];

for (let i = 0; i < 256; i++) {
  _p[256 + i] = _p[i];
}

function fade (t) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp (t, a, b) {
  return a + t * (b - a);
}

function grad (hash, x, y, z) {
  const h = hash & 15;
  const u = h < 8 ? x : y, v = h < 4 ? y : h == 12 || h == 14 ? x : z;
  return ((h & 1) == 0 ? u : - u) + ((h & 2) == 0 ? v : - v);
}

function noise (x, y, z) {

  const floorX = Math.floor(x), floorY = Math.floor(y), floorZ = Math.floor(z);

  const X = floorX & 255, Y = floorY & 255, Z = floorZ & 255;

  x -= floorX;
  y -= floorY;
  z -= floorZ;

  const xMinus1 = x - 1, yMinus1 = y - 1, zMinus1 = z - 1;

  const u = fade(x), v = fade(y), w = fade(z);

  const A = _p[X] + Y, AA = _p[A] + Z, AB = _p[A + 1] + Z, B = _p[X + 1] + Y, BA = _p[B] + Z, BB = _p[B + 1] + Z;

  return lerp(w, lerp(v, lerp(u, grad(_p[AA], x, y, z),
    grad(_p[BA], xMinus1, y, z)),
    lerp(u, grad(_p[AB], x, yMinus1, z),
      grad(_p[BB], xMinus1, yMinus1, z))),
    lerp(v, lerp(u, grad(_p[AA + 1], x, y, zMinus1),
      grad(_p[BA + 1], xMinus1, y, zMinus1)),
      lerp(u, grad(_p[AB + 1], x, yMinus1, zMinus1),
        grad(_p[BB + 1], xMinus1, yMinus1, zMinus1))));

}
let fragmentShaderSource = `
    // #version 300 es
    precision mediump sampler3D;
    #define epsilon 0.0001
    uniform sampler3D map;
    uniform sampler2D color_ramp;
    uniform vec3 halfdim;

    in vec3 vOrigin;
    in vec3 vDirection;
    out vec4 color;

    uniform float threshold;
    uniform float steps;

    vec2 hitBox( vec3 orig, vec3 dir ) {
      vec3 box_min = vec3( -halfdim );
      vec3 box_max = vec3( halfdim );
      vec3 inv_dir = 1.0 / dir;
      vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
      vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
      vec3 tmin = min( tmin_tmp, tmax_tmp );  // 光线在每个维度上与包围盒相交的最小参数值。
      vec3 tmax = max( tmin_tmp, tmax_tmp );  // 光线在每个维度上与包围盒相交的最大参数值。
      float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
      float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
      return vec2( t0, t1 );
    }

    float getData(vec3 pos_lxs){
      vec3 pos=pos_lxs/(halfdim*2.);  // 将坐标转化为纹理坐标
      return texture(map,pos).a;
    }
    vec3 getRGBData(vec3 pos_lxs){
      vec3 pos=pos_lxs/(halfdim*2.);  // 将坐标转化为纹理坐标
      return texture(map,pos).rgb;
    }

    vec3 normal( vec3 coord ) {
      if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );  // 边界点
      if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );
      if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );
      if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );
      if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );
      if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );

      float step = 0.01;
      float x = getData( coord + vec3( - step, 0.0, 0.0 ) ) - getData( coord + vec3( step, 0.0, 0.0 ) );
      float y = getData( coord + vec3( 0.0, - step, 0.0 ) ) - getData( coord + vec3( 0.0, step, 0.0 ) );
      float z = getData( coord + vec3( 0.0, 0.0, - step ) ) - getData( coord + vec3( 0.0, 0.0, step ) );

      return normalize( vec3( x, y, z ) );
    }

    void main(){
      vec3 rayDir = normalize( vDirection );
      vec2 bounds = hitBox( vOrigin, rayDir );
      if ( bounds.x > bounds.y ) discard;
      bounds.x = max( bounds.x, 0.0 );
      vec3 p = vOrigin + bounds.x * rayDir;
      vec3 inc = 1.0 / abs( rayDir );
      float delta = min( inc.x, min( inc.y, inc.z ) );
      delta /= steps;
      for ( float t = bounds.x; t < bounds.y; t += delta ) {
        float d=getData(p+halfdim);
        if ( d > threshold ) {
          // color = vec4(d, d, d, 1.0);
          // color.rgb = getRGBData(p+halfdim) * 0.5;
          color = texture( color_ramp, vec2(d, 0.5 ));
          if(color.r == 1.0){
            color = vec4(0.0, 0.0, 0.0, 0.0);
          }
          // color.rgb = normal( p + 0.5 ) * 0.5 + ( p * 1.5 + 0.25 );
          // color.a = 1;
          break;
        }
        p += rayDir * delta;
      }
      if ( color.a == 0.0 ) discard;
    }
 `;

const vertexShaderSource = `
    in vec3 position;
    in vec2 st;
    out vec3 vOrigin;
    out vec3 vDirection;

    void main()
    {
      vOrigin=czm_encodedCameraPositionMCHigh+czm_encodedCameraPositionMCLow;
      vDirection=position-vOrigin;

      gl_Position = czm_modelViewProjection * vec4(position,1.0);
    }
`;

let viewModel = {
  steps: 100,
  threshold: 0.5
}

function updatePostProcess (v) {

}
const size = 128;

const gui = new dat.GUI()
gui.add(viewModel, 'threshold', 0, 1, 0.01)// 按钮
gui.add(viewModel, 'steps', 0, 300, 1)// 按钮

class voxelPrimitive {
  constructor(options) {
    this.drawCommand = undefined;
    if (Cesium.defined(options)) {
      this.modelMatrix = options.modelMatrix;
      this.geometry = options.geometry;
      this.data = options.data;
      this.halfdim = new Cesium.Cartesian3();
      Cesium.Cartesian3.divideByScalar(options.dim, 2, this.halfdim);
      this.options = options;
      // 根据值绘制对应的颜色
      const colorArray = [
        [0, [162, 70, 145, 1]],
        [0.1, [143, 89, 169, 1]],
        [0.2, [157, 219, 217, 1]],
        [0.3, [106, 191, 181, 1]],
        [0.4, [100, 166, 189, 1]],
        [0.5, [93, 133, 198, 1]],
        [0.6, [68, 125, 99, 1]],
        [0.7, [128, 147, 24, 1]],
        [0.8, [243, 183, 4, 1]],
        [0.9, [232, 83, 25, 1]],
        [1.0, [71, 14, 0, 1]],
      ];
      const colors = colorArray.map((item) => [item[0] - 273.15, 'rgba(' + item[1].join(',') + ')']);

      const colorOptions = {
        colorScaleType: 'linear', // step / linear
        step: 3, // booleen / number
      };
      this.color = this.createColorTexture([], colors, colorOptions);
    }
  }
  getTexture (context) {
    if (!this.texture) {
      const texture_size = Math.ceil(Math.sqrt(this.data.length));
      this.texture = new Texture3D({
        width: this.options.width,
        height: this.options.height,
        depth: this.options.depth,
        context: context,
        flipY: false,
        pixelFormat: Cesium.PixelFormat.ALPHA,
        pixelDataType: Cesium.ComponentDatatype.fromTypedArray(
          this.data
        ),
        source: {
          width: texture_size,
          height: texture_size,
          arrayBufferView: this.data,
        },
        sampler: new Cesium.Sampler({
          minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
          magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
        }),
      })
    }
    return this.texture;
  }
  createGradient (interpolateColor, min, max, w, h, gradient, ctx) {
    for (let i = 0; i < interpolateColor.length; i += 1) {
      const key = interpolateColor[i].key;
      const color = interpolateColor[i].value;
      gradient.addColorStop((key - min) / (max - min), color); // 从0-1填充颜色
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
  createStepGradient (interpolateColor, min, max, w, h, ctx) {
    for (let i = 0; i < interpolateColor.length; i += 1) {
      const key = interpolateColor[i].key;
      let keyNext = key;
      if (i < interpolateColor.length - 1) {
        keyNext = interpolateColor[i + 1].key;
      } else {
        keyNext = max;
      }
      const color = interpolateColor[i].value;
      const current = ((key - min) / (max - min)) * w; // 0 - w
      const next = ((keyNext - min) / (max - min)) * w; // 0 - w
      ctx.fillStyle = color;
      ctx.fillRect(current, 0, next - current, 1);
    }
  }
  createColorTexture (range = [], colors, options) {
    const interpolateColor = colors.map((item) => ({
      key: item[0],
      value: item[1],
    }));
    const keys = interpolateColor.map((d) => parseFloat(d.key));
    const [min, max] = [range[0] || Math.min(...keys), range[1] || Math.max(...keys)];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const w = 256;
    const h = 1;
    canvas.width = w;
    canvas.height = h;

    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, w, 0); // 创建颜色渐变
      if (options.colorScaleType === 'linear') {
        this.createGradient(interpolateColor, min, max, w, h, gradient, ctx);
      } else if (options.colorScaleType === 'step') {
        if (options.step === false || options.step === undefined) {
          this.createStepGradient(interpolateColor, min, max, w, h, ctx);
        } else {
          const interval = Number(options?.step); // true == 1
          this.createGradient(interpolateColor, min, max, w, h, gradient, ctx);
          const len = Math.round((max - min) / interval);
          const canvas2 = document.createElement('canvas');
          const ctx2 = canvas2.getContext('2d');
          canvas2.width = w;
          canvas2.height = h;
          for (let j = 0; j < len; j++) {
            let keyNext = j;
            if (j < len - 1) {
              keyNext = j + 1;
            } else {
              keyNext = len;
            }
            const current = Math.round((j / len) * w); // 0 - w
            const color = ctx.getImageData(current, 0, 1, 1).data;
            const next = Math.round((keyNext / len) * w); // 0 - w
            ctx2.fillStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${color[3] / 255})`;
            ctx2.fillRect(current, 0, next - current, h);
          }
          // canvas2 相当于颜色渐变条
          return {
            canvas: canvas2,
            colorRange: [min, max],
          };
        }
      }

      return {
        canvas,
        colorRange: [min, max],
      };
    }
  }

  createCommand (context) {
    if (!Cesium.defined(this.geometry)) return;
    const geometry = Cesium.BoxGeometry.createGeometry(this.geometry);
    const attributelocations = Cesium.GeometryPipeline.createAttributeLocations(geometry);
    this.vertexarray = Cesium.VertexArray.fromGeometry({
      context: context,
      geometry: geometry,
      attributes: attributelocations
    });

    const renderstate = Cesium.RenderState.fromCache({
      depthTest: {
        enabled: true,
      }
    })

    const shaderProgram = Cesium.ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: vertexShaderSource,
      fragmentShaderSource: fragmentShaderSource,
      attributeLocations: attributelocations
    });
    const that = this;
    const uniformmap = {
      threshold: function () { return viewModel.threshold },
      steps: function () { return viewModel.steps },
      map: function () { return that.getTexture(context) },
      color_ramp: function () {
        return new Cesium.Texture({
          context: context,
          source: that.color.canvas
        })
      },
      halfdim () {
        return that.halfdim;
      }
    };

    this.drawCommand = new Cesium.DrawCommand({
      boundingVolume: this.geometry.boundingSphere,
      modelMatrix: this.modelMatrix,
      pass: Cesium.Pass.OPAQUE,
      // pass: Cesium.Pass.TRANSLUCENT,
      shaderProgram: shaderProgram,
      renderState: renderstate,
      vertexArray: this.vertexarray,
      uniformMap: uniformmap
    });
  }

  update (frameState) {
    if (!this.drawCommand) {
      this.createCommand(frameState.context);
    }
    frameState.commandList.push(this.drawCommand);
  }
  isDestroyed () {

  }
}
function Texture3D (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);

  Check.defined("options.context", options.context);

  const context = options.context;
  let width = options.width;
  let height = options.height;
  let depth = options.depth;
  let source = options.source;

  const pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGBA);
  const pixelDatatype = defaultValue(options.pixelDataType, PixelDatatype.UNSIGNED_BYTE);
  const internalFormat = PixelFormat.toInternalFormat(pixelFormat, pixelDatatype, context);

  if (!defined(width) || !defined(height) || !defined(depth)) {
    throw new DeveloperError(
      "options requires a source field to create an 3d texture. width or height or dimension fileds"
    )
  }

  Check.typeOf.number.greaterThan("width", width, 0);

  if (width > ContextLimits.maximumTextureSize) {
    throw new DeveloperError(
      "width must be less than or equal to the maximum texture size"
    );
  }

  Check.typeOf.number.greaterThan("height", height, 0);

  if (height > ContextLimits.maximumTextureSize) {
    throw new DeveloperError(
      "height must be less than or equal to the maximum texture size"
    );
  }

  Check.typeOf.number.greaterThan("dimensions", depth, 0);

  if (depth > ContextLimits.maximumTextureSize) {
    throw new DeveloperError(
      "dimension must be less than or equal to the maximum texture size"
    );
  }

  if (!PixelFormat.validate(pixelFormat)) {
    throw new DeveloperError("Invalid options.pixelFormat.");
  }

  if (!PixelDatatype.validate(pixelDatatype)) {
    throw new DeveloperError("Invalid options.pixelDatatype.");
  }

  let initialized = true;
  const gl = context._gl;
  const textureTarget = gl.TEXTURE_3D;
  const texture = gl.createTexture();

  const lxs = gl.getParameter(gl.ACTIVE_TEXTURE);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(textureTarget, texture);
  let unpackAlignment = 4;
  if (defined(source) && defined(source.arrayBufferView)) {
    unpackAlignment = PixelFormat.alignmentInBytes(pixelFormat, pixelDatatype, width);//??
  }

  gl.pixelStorei(gl.UNPACK_ALIGNMENT, unpackAlignment);
  gl.pixelStorei(
    gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,
    gl.BROWSER_DEFAULT_WEBGL
  );

  if (defined(source)) {
    if (defined(source.arrayBufferView)) {
      let arrayBufferView = source.arrayBufferView;
      gl.texImage3D(
        textureTarget,
        0,
        internalFormat,
        width,
        height,
        depth,
        0,//border
        pixelFormat,
        PixelDatatype.toWebGLConstant(pixelDatatype, context),
        arrayBufferView
      );
      initialized = true;
    }
  }
  gl.bindTexture(textureTarget, null);
  this._id = createGuid();
  this._context = context;
  this._textureFilterAnisotropic = context._textureFilterAnisotropic;
  this._textureTarget = textureTarget;
  this._texture = texture;
  this._internalFormat = internalFormat;
  this._pixelFormat = pixelFormat;
  this._pixelDatatype = pixelDatatype;
  this._width = width;
  this._height = height;
  this._depth = depth;
  this._dimensions = new Cartesian3(width, height, depth);
  this._hasMinmap = false;
  this._sizeInBytes = 4;
  this._preMultiplyAlpha = false;
  this._flipY = false;
  this._initialized = initialized;
  this._sampler = undefined;

  this.sampler = defined(options.sampler) ? options.sampler : new Sampler();
}

// Creates a texture, and copies a subimage of the framebuffer to it.
Texture3D.fromFramebuffer = function (options) {
  options = defaultValue(options, defaultValue.EMPTY_OBJECT);
  Check.defined("options.context", options.context);

  const context = options.context;
  const gl = context._gl;

  const pixelFormat = defaultValue(options.pixelFormat, PixelFormat.RGB);
  const framebufferXOffset = defaultValue(options.framebufferXOffset, 0);
  const framebufferYOffset = defaultValue(options.framebufferYOffset, 0);
  const width = defaultValue(options.width, gl.drawingBufferWidth);
  const height = defaultValue(options.height, gl.drawingBufferHeight);
  const depth = defaultValue(options.depth, 128);
  const framebuffer = options.framebuffer;

  const texture = new Texture3D({
    context: context,
    width: width,
    height: height,
    pixelFormat: pixelFormat,
    source: {
      framebuffer: defined(framebuffer) ? framebuffer : context.defaultFramebuffer,
      width: width,
      height: height,
      depth: depth,
    }
  });
  return texture;
};

Object.defineProperties(Texture3D.prototype, {
  id: {
    get: function () {
      return this._id;
    }
  },
  sampler: {
    get: function () {
      return this._sampler;
    },
    set: function (sampler) {
      let minificationFilter = sampler.minificationFilter;
      let magnificationFilter = sampler.magnificationFilter;
      const context = this._context;
      const pixelFormat = this._pixelFormat;
      const pixelDatatype = this._pixelDatatype;

      const gl = context._gl;
      const target = this._textureTarget;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(target, this._texture);
      // 3D 纹理不设置放大，缩小，重采样
      gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, minificationFilter);
      gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, magnificationFilter);
      gl.bindTexture(target, null);

      this._sampler = sampler;
    }
  },
  dimensions: {
    get: function () {
      return this._dimensions;
    }
  },
  width: {
    get: function () {
      return this._width;
    }
  },
  height: {
    get: function () {
      return this._height;
    }
  },
  depth: {
    get: function () {
      return this._depth;
    }
  },
  _target: {
    get: function () {
      return this._textureTarget;
    }
  }
});

Texture3D.prototype.isDestroyed = function () {
  return false;
}

Texture3D.prototype.destory = function () {
  this._context._gl.deleteTexture(this._texture);
  return destroyObject(this);
};
//texture 云噪声纹理

var detail_map

const dim = new Cesium.Cartesian3(16, 13, 4);

var geometry = Cesium.BoxGeometry.fromDimensions({
  vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,
  dimensions: dim,
});

const primitive_modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(
      121,
      29
    )
  ),
  new Cesium.Cartesian3(0.0, 0.0, 8000.0),
  new Cesium.Matrix4()
);

// let pro = Cesium.Resource.fetchArrayBuffer({
//   url: "http://192.168.1.40:5500/voxel-render/texture.bin"//64*64*64 ,存储的是3d噪声纹理
// }).then(result => {
//   let uintData = new Float32Array(result)
//   console.log(uintData)
//   let size = 64
//   detail_map = new Texture3D({
//     width: size,
//     height: size,
//     depth: size,
//     context: viewer.scene.context,
//     pixelFormat: Cesium.PixelFormat.RGBA,
//     pixelDataType: Cesium.ComponentDatatype.FLOAT,
//     source: {
//       width: size,
//       height: size,
//       arrayBufferView: uintData,
//     },
//     sampler: new Cesium.Sampler({
//       minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
//       magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
//     }),
//   })
// })

let arr = [
  fetch("http://192.168.1.40:5500/voxel-render/CJE_daily_oxygen_date20200101_N01.json").then((res) => res.json()),
  fetch("http://192.168.1.40:5500/voxel-render/ECS_bathy.json").then((res) => res.json()),
  // fetch("http://192.168.1.40:5500/voxel-render/buquan3.json").then((res) => res.json())
]
// arr.push(pro)


const localTransformParams = new Cesium.TranslationRotationScale(
  new Cesium.Cartesian3(0, 0, 0),
  null,
  new Cesium.Cartesian3(10000, 10000, 10000)
);
const localTransform =
  Cesium.Matrix4.fromTranslationRotationScale(localTransformParams);
Cesium.Matrix4.multiply(primitive_modelMatrix, localTransform, primitive_modelMatrix);
Promise.all(arr).then((res) => {
  console.log(res)
  let r1 = res[0];
  let r2 = res[1];
  let x = r1.oxygen.length;
  let y = r1.oxygen[0].length;
  let z = 75;
  console.log(x, y, z)
  // let x = 128;
  // let y = 128;
  // let z = 128;
  let data = new Uint8Array(x * y * z);
  let index = 0;
  let mask = r2.mask;
  let he = r2.he;
  let oxygen = r1.oxygen;
  for (let i = 0; i < z; i++) {
    for (let j = 0; j < y; j++) {
      for (let k = 0; k < x; k++) {
        if (oxygen[k][j] == "NaN") {
          data[index++] = 255;
        } else if (mask[k][j] == "NaN") {
          data[index++] = 255;
        } else {
          let heValue = 1500 - he[k][j];
          if (i * 20 > heValue && (i + 1) * 20 < heValue) {
            data[index++] = Math.floor(128 * (oxygen[k][j] / 10)) + 128;
          } else if (i * 20 < heValue) {
            data[index++] = 255;
          } else {
            data[index++] = 0;
          }
        }
        // dx = k * 1.0 / x;
        // dy = j * 1.0 / y;
        // dz = i * 1.0 / z;
        // const d = noise(dx * 6.5, dy * 6.5, dz * 6.5);
        // data[index++] = d * 128 + 128;
      }
    }
  }
  console.log(data)
  /**
   * 生成体数据
   */
  //data在0~255之间

  // const data = new Uint8Array(size * size * size);
  // let dx, dy, dz;
  // let i = 0;
  // for (let z = 0; z < size; z++) {
  //   for (let y = 0; y < size; y++) {
  //     for (let x = 0; x < size; x++) {
  //       dx = x * 1.0 / size;
  //       dy = y * 1.0 / size;
  //       dz = z * 1.0 / size;
  //       const d = noise(dx * 6.5, dy * 6.5, dz * 6.5);
  //       data[i++] = d * 128 + 128;
  //       // data[i++]=0;
  //     }
  //   }
  // }
  const options = {
    modelMatrix: primitive_modelMatrix,
    geometry: geometry,
    dim: dim,
    data: data,
    width: x,
    height: y,
    depth: z
  };
  const lxs = viewer.scene.primitives.add(
    new voxelPrimitive(options)
  );
})

// viewer.trackedEntity = viewer.entities.add({
//   name: "Yellow box outline",
//   position: Cesium.Cartesian3.fromDegrees(124.21936679679918,
//     45.85136872098397, 80.0),
//   box: {
//     dimensions: dim,
//     fill: false,
//     outline: true,
//     outlineColor: Cesium.Color.YELLOW,
//   },
// });
viewer.camera.lookAt(new Cartesian3.fromDegrees(121,
  29, 40000), new Cartesian3(2, 2, 2));