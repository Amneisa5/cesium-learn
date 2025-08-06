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

let pro = Cesium.Resource.fetchArrayBuffer({

  url: " http://192.168.1.40:60838/voxel-render/texture.bin"//64*64*64 ,存储的是3d噪声纹理

}).then(data => {
  let uintData = new Float32Array(data)
  let size = 64
  detail_map = new Texture3D({
    width: size,
    height: size,
    depth: size,
    context: viewer.scene.context,
    pixelFormat: Cesium.PixelFormat.RGBA,
    pixelDataType: Cesium.ComponentDatatype.FLOAT,
    source: {
      width: size,
      height: size,
      arrayBufferView: uintData,
    },
    sampler: new Cesium.Sampler({
      minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
      magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
    }),
  })
})

let arr = []
arr.push(pro)

const dim = new Cesium.Cartesian3(1, 1, 1);

var geometry = Cesium.BoxGeometry.fromDimensions({
  vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,
  dimensions: dim,
});

const primitive_modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(
      124.21936679679918,
      45.85136872098397
    )
  ),
  new Cesium.Cartesian3(0.0, 0.0, 80.0),
  new Cesium.Matrix4()
);

Promise.all(arr).then(() => {

  let fragmentShaderSource = `
    // #version 300 es
    precision mediump sampler3D;
    #define epsilon 0.0001
    uniform sampler3D map;

    in vec3 vOrigin;
    in vec3 vDirection;
    out vec4 color;

    uniform float threshold;
    uniform float steps;

    vec2 hitBox( vec3 orig, vec3 dir ) {
      const vec3 box_min = vec3( - 0.5 );
      const vec3 box_max = vec3( 0.5 );
      vec3 inv_dir = 1.0 / dir;
      vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
      vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
      vec3 tmin = min( tmin_tmp, tmax_tmp );
      vec3 tmax = max( tmin_tmp, tmax_tmp );
      float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
      float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
      return vec2( t0, t1 );
    }

    float sample1( vec3 p ) {
      return texture( map, p ).r;
    }

    vec3 normal( vec3 coord ) {
      if ( coord.x < epsilon ) return vec3( 1.0, 0.0, 0.0 );
      if ( coord.y < epsilon ) return vec3( 0.0, 1.0, 0.0 );
      if ( coord.z < epsilon ) return vec3( 0.0, 0.0, 1.0 );
      if ( coord.x > 1.0 - epsilon ) return vec3( - 1.0, 0.0, 0.0 );
      if ( coord.y > 1.0 - epsilon ) return vec3( 0.0, - 1.0, 0.0 );
      if ( coord.z > 1.0 - epsilon ) return vec3( 0.0, 0.0, - 1.0 );
      float step = 0.01;
      float x = sample1( coord + vec3( - step, 0.0, 0.0 ) ) - sample1( coord + vec3( step, 0.0, 0.0 ) );
      float y = sample1( coord + vec3( 0.0, - step, 0.0 ) ) - sample1( coord + vec3( 0.0, step, 0.0 ) );
      float z = sample1( coord + vec3( 0.0, 0.0, - step ) ) - sample1( coord + vec3( 0.0, 0.0, step ) );
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
        float d = sample1( p + 0.5 );
        if ( d > threshold ) {
          color.rgb = normal( p + 0.5 ) * 0.5 + ( p * 1.5 + 0.25 );
          color.a = 1.;
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
    steps: 200,
    threshold: 0.6
  }

  function updatePostProcess (v) {

  }

  const gui = new dat.GUI()
  gui.add(viewModel, 'threshold', 0, 1, 0.01).onChange(updatePostProcess)// 按钮
  gui.add(viewModel, 'steps', 0, 300, 1).onChange(updatePostProcess)// 按钮

  class voxelPrimitive {
    constructor(options) {
      this.drawCommand = undefined;
      if (Cesium.defined(options)) {
        this.modelMatrix = options.modelMatrix;
        this.geometry = options.geometry;
        this.data = options.data;
        this.halfdim = new Cesium.Cartesian3();
        Cesium.Cartesian3.divideByScalar(options.dim, 2, this.halfdim);
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
        map: function () { return detail_map }
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

  const options = {
    modelMatrix: primitive_modelMatrix,
    geometry: geometry,
    dim: dim
  };



  const lxs = viewer.scene.primitives.add(
    new voxelPrimitive(options)
  );

})



viewer.trackedEntity = viewer.entities.add({
  name: "Yellow box outline",
  position: Cesium.Cartesian3.fromDegrees(124.21936679679918,
    45.85136872098397, 80.0),
  box: {
    dimensions: dim,
    fill: false,
    outline: true,
    outlineColor: Cesium.Color.YELLOW,
  },
});
viewer.camera.lookAt(new Cartesian3.fromDegrees(124.21936679679918,
  45.85136872098397, 80), new Cartesian3(2, 2, 2));