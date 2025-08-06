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
class VoxelPrimitive {
  constructor(options) {
    this.drawCommand = undefined;
    if (Cesium.defined(options)) {
      this.modelMatrix = options.modelMatrix;
      this.geometry = options.geometry;
      this.data = options.data;
      this.halfdim = new Cesium.Cartesian3();
      this.size = options.size;
      Cesium.Cartesian3.divideByScalar(options.dim, 2, this.halfdim);
      // this.viewModel = {
      //   steps: 200,
      //   threshold: 0.6
      // }
      // const gui = new dat.GUI()
      // let f1 = gui.addFolder('perlin设置');
      // f1.add(this.viewModel, 'threshold', 0, 1);
      // f1.add(this.viewModel, 'steps', 0, 300);
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
      threshold: function () { return 0.6 },
      steps: function () { return 200 },
      map: function () { return that.getTexture(context) }
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
  getTexture (context) {
    let size = this.size;
    if (!this.texture) {
      this.texture = new Texture3D({
        width: size,
        height: size,
        depth: size,
        context: context,
        pixelFormat: Cesium.PixelFormat.RGBA,
        pixelDataType: Cesium.ComponentDatatype.FLOAT,
        source: {
          width: size,
          height: size,
          arrayBufferView: this.data,
        },
        sampler: new Cesium.Sampler({
          minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
          magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
        }),
      });
    }

    return this.texture;
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