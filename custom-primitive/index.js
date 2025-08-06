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
    var v4 = [0.5, 0.25, -0.5];
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
      // 上 +z
      ...v1,
      ...v0,
      ...v5,
      ...v6,
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
      // 上 +z
      ...npz,
      ...npz,
      ...npz,
      ...npz,
    ]);

    // 1.3 定义纹理数组  一个面的四个点
    var sts = new Float32Array([
      0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1,
      1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1,
    ]);

    // 1.4 定义索引 决定几何体顶点的链接顺序
    var indices = new Uint16Array([
      0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14, 12, 14, 15, 16, 17, 18, 16, 18, 19, 20,
      21, 22, 20, 22, 23,
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
    // vtxf 使用double类型的position进行计算
    // var attributeLocations = {
    //     position3DHigh : 0,
    //     position3DLow : 1,
    //     normal : 2,
    //     textureCoordinates : 3,
    // };

    // 1.6 定义attributeLocations
    var attributeLocations = {
      position: 0,
      normal: 1,
      textureCoordinates: 2,
    };

    // 1.7 定义shader
    var vtxfVertexShader = `
          // vtxf 使用double类型的position进行计算
          // attribute vec3 position3DHigh;
          // attribute vec3 position3DLow;
          in vec3 position;
          in vec3 normal;
          in vec2 st;
          in float batchId;

          out vec3 v_positionEC;
          out vec3 v_normalEC;
          out vec2 v_st;

          void main()
          {
              // vtxf 使用double类型的position进行计算
              // vec4 p = czm_translateRelativeToEye(position3DHigh, position3DLow);
              // v_positionEC = (czm_modelViewRelativeToEye * p).xyz;      // position in eye coordinates
              // v_normalEC = czm_normal * normal;                         // normal in eye coordinates
              // v_st = st;
              // gl_Position = czm_modelViewProjectionRelativeToEye * p;
              // 计算顶点在眼坐标中的位置
              v_positionEC = (czm_modelView * vec4(position, 1.0)).xyz;       // position in eye coordinates
              // 计算顶点在眼坐标中的法线向量
              v_normalEC = czm_normal * normal;                               // normal in eye coordinates
              v_st = st;  // 纹理坐标
              // 将顶点从模型空间转换到裁剪空间
              gl_Position = czm_modelViewProjection * vec4(position, 1.0);
          }
          `;

    var vtxfFragmentShader = `
          in vec3 v_positionEC;
          in vec3 v_normalEC;
          in vec2 v_st;
          out vec4 fragColor;

          uniform sampler2D myImage;

          void main()
          {
            // 计算顶点到眼睛的位置向量
            // _positionEC: 这是一个在顶点着色器中计算并传递到片元着色器的变量，表示顶点在眼坐标系（Eye Coordinates）中的位置。
            // -v_positionEC: 通过取v_positionEC的负值，得到从顶点指向眼睛（即相机位置）的位置向量。在眼坐标系中，眼睛位于原点（0, 0, 0），因此从顶点到眼睛的向量就是顶点位置的负值。
            // positionToEyeEC: 这是一个输出变量，用于存储从顶点到眼睛的位置向量
            vec3 positionToEyeEC = -v_positionEC;
            // 计算单位法向量
            
            vec3 normalEC = normalize(v_normalEC);
            #ifdef FACE_FORWARD
                normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
            #endif

                czm_materialInput materialInput;
                materialInput.normalEC = normalEC;
                materialInput.positionToEyeEC = positionToEyeEC;
                materialInput.st = v_st;

                //czm_material material = czm_getMaterial(materialInput);
                czm_material material = czm_getDefaultMaterial(materialInput);
                material.diffuse = texture(myImage, materialInput.st).rgb;

            #ifdef FLAT
                fragColor = vec4(material.diffuse + material.emission, material.alpha);
            #else
                fragColor = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
            #endif
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
      console.log(geometry)
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
        myImage: function () {
          if (Cesium.defined(texture)) {
            return texture;
          } else {
            return context.defaultTexture;
          }
        },
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
var scaleMatrix = Cesium.Matrix4.fromScale(new Cesium.Cartesian3(1, 1, 1));
var modelMatrix = Cesium.Matrix4.multiply(enuMatrix, scaleMatrix, new Cesium.Matrix4());

var myBox = viewer.scene.primitives.add(new VtxfPrimitive(modelMatrix));
// drawColorPlane();
viewer.camera.lookAt(position, new Cesium.HeadingPitchRange(0, 0, 1));
// viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(position, 100000));