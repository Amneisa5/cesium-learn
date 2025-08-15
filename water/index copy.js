Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMDg0MzI2Ni0wMGI3LTQyOTYtOGM1Zi1iMTE4OTkxMTgyYzciLCJpZCI6MTc1MDE3LCJpYXQiOjE3NTQ5ODAxMTd9.Id_Wy_2_BUC537hz_sZlLTVbQ4i93qGgcR-Ro7X7qXA'
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



const drawColorPlane = () => {
  //坐标
  var mypositions = Cesium.Cartesian3.fromDegreesArrayHeights([
    // Triangle A
    -90.6714, 35.9641, 322.543, -94.6717, 38.9642, 325.51, -97.6717, 35.9639, 324.724,
    // Triangle B
    -94.6717, 30.9639, 324.717, -90.6717, 32.9639, 324.724, -94.6717, 34.9639, 324.719,
  ]);
  //加入点
  var pointCollection = new Cesium.PointPrimitiveCollection();
  for (var i = 0; i < mypositions.length; i++) {
    pointCollection.add({
      position: mypositions[i],
      color: Cesium.Color.YELLOW,
    });
  }
  viewer.scene.primitives.add(pointCollection);
  //固定相机位置
  var extent = Cesium.Rectangle.fromDegrees(-98, 30, -90, 39);
  Cesium.Camera.DEFAULT_VIEW_RECTANGLE = extent;
  Cesium.Camera.DEFAULT_VIEW_FACTOR = 0.5;

  //点的数量
  var numPositions = mypositions.length;
  //点存储空间
  var pos = new Float64Array(numPositions * 3);
  //向量存储空间
  var normals = new Float32Array(numPositions * 3);
  for (var i = 0; i < numPositions; ++i) {
    pos[i * 3] = mypositions[i].x;
    pos[i * 3 + 1] = mypositions[i].y;
    pos[i * 3 + 2] = mypositions[i].z;
    normals[i * 3] = 0.0;
    normals[i * 3 + 1] = 0.0;
    normals[i * 3 + 2] = 1.0;
  }
  //创建geometry
  var geometry = new Cesium.Geometry({
    attributes: {
      position: new Cesium.GeometryAttribute({
        // not FLOAT
        componentDatatype: Cesium.ComponentDatatype.DOUBLE,
        componentsPerAttribute: 3,
        values: pos,
      }),
      normal: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 3,
        values: normals,
      }),
    },
    primitiveType: Cesium.PrimitiveType.TRIANGLES,
    boundingSphere: Cesium.BoundingSphere.fromVertices(pos),
  });
  //绘制三角带
  var myInstance = new Cesium.GeometryInstance({
    geometry: geometry,
    attributes: {
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED),
    },
    show: new Cesium.ShowGeometryInstanceAttribute(true),
  });
  viewer.scene.primitives.add(
    new Cesium.Primitive({
      geometryInstances: [myInstance],
      asynchronous: false,
      appearance: new Cesium.PerInstanceColorAppearance({
        closed: true,
        translucent: false,
      }),
    })
  );
};
class VtxfPrimitive {
  constructor(modelMatrix) {
    // 1.0 立方体顶点位置标号，以及坐标系示意图
    // 立方体
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    // 坐标系
    //  z
    //  | /y
    //  |/
    //  o------x

    // 1.1 定义位置数组
    var v0 = [0.5, -0.5, 0.5];
    var v1 = [-0.5, -0.5, 0.5];
    var v2 = [-0.5, -0.5, -0.5];
    var v3 = [0.5, -0.5, -0.5];
    var v4 = [0.5, 0.5, -0.5];
    var v5 = [0.5, 0.5, 0.5];
    var v6 = [-0.5, 0.5, 0.5];
    var v7 = [-0.5, 0.5, -0.5];
    var rawVertex = [
      // 下 -z
      ...v2,
      ...v3,
      ...v4,
      ...v7,
      // 前 -y
      ...v2,
      ...v3,
      ...v0,
      ...v1,
      // 后 +y
      ...v4,
      ...v7,
      ...v6,
      ...v5,
      // 左 -x
      ...v7,
      ...v2,
      ...v1,
      ...v6,
      // 右 +x
      ...v3,
      ...v4,
      ...v5,
      ...v0,
    ];
    var positions = new Float64Array(rawVertex);

    // 1.2 定义法向数组
    var npx = [1, 0, 0];
    var nnx = [-1, 0, 0];
    var npy = [0, 1, 0];
    var nny = [0, -1, 0];
    var npz = [0, 0, 1];
    var nnz = [0, 0, -1];
    var normals = new Float32Array([
      // 下 -z
      ...nnz,
      ...nnz,
      ...nnz,
      ...nnz,
      // 前 -y
      ...nny,
      ...nny,
      ...nny,
      ...nny,
      // 后 +y
      ...npy,
      ...npy,
      ...npy,
      ...npy,
      // 左 -x
      ...nnx,
      ...nnx,
      ...nnx,
      ...nnx,
      // 右 +x
      ...npx,
      ...npx,
      ...npx,
      ...npx,
    ]);

    // 1.3 定义纹理数组  一个面的四个点
    var sts = new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1,
      0, 0, 1, 0, 1, 1, 0, 1
    ]);

    // 1.4 定义索引 决定几何体顶点的链接顺序
    var indices = new Uint16Array([
      0, 1, 2, 0, 2, 3,
      4, 5, 6, 4, 6, 7,
      8, 9, 10, 8, 10, 11,
      12, 13, 14, 12, 14, 15,
      16, 17, 18, 16, 18, 19
    ]);
    // 1.5 定义纹理
    var texture = undefined;
    var imgUrl = window.location.origin + '/custom-primitive/cesium_stripes.png';
    Cesium.Resource.createIfNeeded(imgUrl)
      .fetchImage()
      .then(function (image) {
        console.log(image)
        console.log('image loaded!');
        var vtxfTexture;
        var context = viewer.scene.context;
        if (Cesium.defined(image.internalFormat)) {
          vtxfTexture = new Cesium.Texture({
            context: context,
            pixelFormat: image.internalFormat,
            width: image.width,
            height: image.height,
            source: {
              arrayBufferView: image.bufferView,
            },
            sampler: new Cesium.Sampler({
              minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
              magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
            }),
          });
        } else {
          vtxfTexture = new Cesium.Texture({
            context: context,
            source: image,
            sampler: new Cesium.Sampler({
              minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
              magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
            }),
          });
        }

        texture = vtxfTexture;
      });
    // 1.6 定义attributeLocations
    var attributeLocations = {
      position: 0,
      normal: 1,
      textureCoordinates: 2,
    };

    // 1.7 定义shader
    var vtxfVertexShader = `
        in vec3 position;
        in vec3 normal;
        in vec2 st;

        out vec3 v_positionEC;
        out vec3 v_normalEC;
        out vec2 v_st;
        out vec3 v_eye;
        out vec3 v_pos;

        void main()
        {
          v_positionEC = (czm_modelView * vec4(position, 1.0)).xyz;       // position in eye coordinates
          v_normalEC = czm_normal * normal;                               // normal in eye coordinates
          v_st = st;
          
          vec4 pos = czm_modelViewProjection * vec4(position, 1.0);
          // Calculate eye position in model space for proper reflection/refraction
          v_eye = -(czm_inverseModelViewProjection * vec4(pos.xy, -1.0, 1.0)).xyz;
          v_pos = position;
          
          gl_Position = pos;
        }
          `;

    var vtxfFragmentShader = `
          const float IOR_AIR = 1.0;
          const float IOR_WATER = 1.333;

          const vec3 abovewaterColor = vec3(0.25, 1.0, 1.25);
          const vec3 underwaterColor = vec3(0.4, 0.9, 1.0);

          const float poolHeight = 1.0;

          in vec3 v_positionEC;
          in vec3 v_normalEC;
          in vec2 v_st;
          in vec3 v_eye;
          in vec3 v_pos;

          out vec4 fragColor;

          uniform sampler2D water;
          uniform vec3 light;
          uniform sampler2D causticTex;
          uniform bool underwater;

          vec2 intersectCube(vec3 origin, vec3 ray, vec3 cubeMin, vec3 cubeMax) {
            vec3 tMin = (cubeMin - origin) / ray;
            vec3 tMax = (cubeMax - origin) / ray;
            vec3 t1 = min(tMin, tMax);
            vec3 t2 = max(tMin, tMax);
            float tNear = max(max(t1.x, t1.y), t1.z);
            float tFar = min(min(t2.x, t2.y), t2.z);
            return vec2(tNear, tFar);
          }


          vec3 getWallColor(vec3 point) {
            float scale = 0.5;
            vec3 wallColor;
            vec3 normal;
            
            // Simple solid color for pool walls
            wallColor = vec3(0.5, 0.5, 0.7); // Changed to solid color
            if (abs(point.x) > 0.999) {
              normal = vec3(-sign(point.x), 0.0, 0.0);
            } else if (abs(point.z) > 0.999) {
              normal = vec3(0.0, 0.0, -sign(point.z));
            } else {
              normal = vec3(0.0, sign(point.y), 0.0);
            }
            
            scale /= length(point) + 0.1; /* pool ambient occlusion */

            /* simple lighting - modified to avoid black surfaces */
            float diffuse = max(0.3, dot(normal, light)); // Increased minimum light to 0.3 to avoid black
            scale += diffuse * 0.5;

            return wallColor * scale;
          }


          vec3 getSurfaceRayColor(vec3 origin, vec3 ray, vec3 waterColor) {
            vec3 color;
            vec2 t = intersectCube(origin, ray, vec3(-1.0, -poolHeight, -1.0), vec3(1.0, 2.0, 1.0));
            
            if (ray.y < 0.0) {
              // Ray going down - might hit bottom
              vec3 hit = origin + ray * t.y;
              color = getWallColor(hit);
            } else {
              // Ray going up - might hit top or sides
              vec3 hit = origin + ray * t.y;
              color = getWallColor(hit);
            }

            // Added ambient light to prevent completely dark surfaces
            color = max(color, vec3(0.15)); // Ensure minimum brightness level

            return color * waterColor;
          }

          void main(){
            // Simple water normal based on position
            vec2 coord = v_pos.xz * 0.5 + 0.5;
            vec3 normal = normalize(vec3(sin(coord.x * 10.0) * 0.1, 1.0, cos(coord.y * 10.0) * 0.1));
            
            vec3 eyeVector = normalize(v_eye - v_pos);
            vec3 reflectedRay = reflect(eyeVector, normal);
            vec3 refractedRay = refract(eyeVector, normal, IOR_WATER / IOR_AIR);
            
            // Handle total internal reflection
            bool TIR = dot(eyeVector, normal) > 0.0 && refractedRay == vec3(0.0);
            
            float fresnel = pow(1.0 - max(0.0, dot(-eyeVector, normal)), 3.0);
            fresnel = mix(0.25, 1.0, fresnel);
            
            vec3 reflectedColor = getSurfaceRayColor(v_pos, reflectedRay, abovewaterColor);
            vec3 refractedColor;
            
            if (TIR) {
              refractedColor = reflectedColor;
            } else {
              refractedColor = getSurfaceRayColor(v_pos, refractedRay, underwaterColor);
            }
            
            vec3 color = mix(refractedColor, reflectedColor, fresnel);
            
            // Water surface color - ensure minimum brightness
            color = max(color, vec3(0.1));
            fragColor = vec4(color, 0.1); 
          }
          `;

    // 1.8 创建vertexArray
    function createVertexArray (context) {
      var geometry = new Cesium.Geometry({
        attributes: {
          position: new Cesium.GeometryAttribute({
            // vtxf 使用double类型的position进行计算
            // componentDatatype : Cesium.ComponentDatatype.DOUBLE,
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: positions,
          }),
          normal: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 3,
            values: normals,
          }),
          textureCoordinates: new Cesium.GeometryAttribute({
            componentDatatype: Cesium.ComponentDatatype.FLOAT,
            componentsPerAttribute: 2,
            values: sts,
          }),
        },
        // Workaround Internet Explorer 11.0.8 lack of TRIANGLE_FAN
        indices: indices,
        primitiveType: Cesium.PrimitiveType.TRIANGLES,
        boundingSphere: Cesium.BoundingSphere.fromVertices(positions),
      });
      var vertexArray = Cesium.VertexArray.fromGeometry({
        context: context,
        geometry: geometry,
        attributeLocations: attributeLocations,
        bufferUsage: Cesium.BufferUsage.STATIC_DRAW,
        // interleave : true
      });

      return vertexArray;
    }

    // 1.9 创建command
    function createCommand (context) {
      var translucent = false;
      var closed = true;
      // 借用一下Appearance.getDefaultRenderState
      var rawRenderState = Cesium.Appearance.getDefaultRenderState(translucent, closed, undefined);
      var renderState = Cesium.RenderState.fromCache(rawRenderState);

      var vertexShaderSource = new Cesium.ShaderSource({
        sources: [vtxfVertexShader],
      });

      var fragmentShaderSource = new Cesium.ShaderSource({
        sources: [vtxfFragmentShader],
      });

      var uniformMap = {
        water: function () {
          return context.defaultTexture;
        },
        light: function () {
          return new Cesium.Cartesian3(0.7559289460184544, 0.7559289460184544, -0.3779644730092272)
        },
        causticTex: function () {
          return context.defaultTexture;
        },
        underwater: { value: false },
      };

      var shaderProgram = Cesium.ShaderProgram.fromCache({
        context: context,
        vertexShaderSource: vertexShaderSource,
        fragmentShaderSource: fragmentShaderSource,
        attributeLocations: attributeLocations,
      });
      return new Cesium.DrawCommand({
        vertexArray: createVertexArray(context),
        primitiveType: Cesium.PrimitiveType.TRIANGLES,
        renderState: renderState,
        shaderProgram: shaderProgram,
        uniformMap: uniformMap,
        owner: this,
        // framebuffer : framebuffer,
        pass: Cesium.Pass.OPAQUE,
        modelMatrix: modelMatrix,
      });
    }

    this.show = true;
    this._command = undefined;
    this._createCommand = createCommand;
  }

  update (frameState) {
    if (!this.show) {
      return;
    }

    if (!Cesium.defined(this._command)) {
      this._command = this._createCommand(frameState.context);
    }

    if (Cesium.defined(this._command)) {
      frameState.commandList.push(this._command);
    }
  }

  isDestroyed () {
    return false;
  }

  destroy () {
    if (Cesium.defined(this._command)) {
      this._command.shaderProgram = this._command.shaderProgram && this._command.shaderProgram.destroy();
    }
    return destroyObject(this);
  }
}

// 2 创建Primitive
var boxLength = 100000.0;
var position = Cesium.Cartesian3.fromDegrees(116.39, 39.9, 0.5 * boxLength);
// var modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
var enuMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(position);
// 放大立方体 - 将缩放值从(1,1,1)增加到(50000,50000,50000)
var scaleMatrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(50000, 50000, 50000));
var modelMatrix = Cesium.Matrix4.multiply(enuMatrix, scaleMatrix, new Cesium.Matrix4());

var myBox = viewer.scene.primitives.add(new VtxfPrimitive(modelMatrix));
// drawColorPlane();
viewer.camera.lookAt(position, new Cesium.HeadingPitchRange(0, 0, 50000));
// viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(position, 100000));