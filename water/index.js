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
    },
    terrain: undefined,
  });
let textureData;
// 确保地形提供者也被设置为undefined以完全禁用地形
viewer.scene.terrainProvider = undefined;


// 设置相机位置以便观察立方体
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(118.76, 32.06, 13500),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-45),
    roll: 0.0
  }
});

// 添加相机.lookAt函数确保相机观察中心对准盒子中心
var boxCenter = Cesium.Cartesian3.fromDegrees(118.76, 32.06, 0);
var cameraPosition = Cesium.Cartesian3.fromDegrees(118.76, 32.06, 15000);
// viewer.camera.lookAt(boxCenter, new Cesium.Cartesian3(0.0, -10000.0, 5000.0));
const readGeoTif = async () => {
  const terrain = "gebco_2023_n32.5_s30.0_w120.0_e123.5.tif";
  const rawTiff = await GeoTIFF.fromUrl(terrain);
  const tifImage = await rawTiff.getImage();
  const width = tifImage.getWidth();
  const height = tifImage.getHeight();
  console.log(width, height)
  textureData = new Float32Array(width * height * 4);
  const data = await tifImage.readRasters({ interleave: true });
  for (let i = 0; i < width * height; i++) {
    textureData[i * 4] = data[i];      // 高度
    textureData[i * 4 + 1] = 0;
    textureData[i * 4 + 2] = 0;
    textureData[i * 4 + 3] = 1;
  }
  const vertices = [];
  const uvs = [];
  const indices = [];

  const heights = []
  const lats = [];
  const lons = [];
  const lonMin = 120, lonMax = 123.5;
  const latMin = 30, latMax = 32.5;
  // 顶点坐标 + UV
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const lon = lonMin + (x / (width - 1)) * (lonMax - lonMin);
      const lat = latMin + (y / (height - 1)) * (latMax - latMin);
      const h = data[index] * 50;
      heights.push(h);
      // 经纬度转世界笛卡尔坐标
      const cartesian = Cesium.Cartesian3.fromDegrees(lon, lat, h);
      vertices.push(cartesian.x, cartesian.y, cartesian.z);
      lats.push(lat);
      lons.push(lon);
      uvs.push(x / (width - 1), y / (height - 1));
    }
  }

  // 三角形索引
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      const a = y * width + x;
      const b = a + 1;
      const c = (y + 1) * width + x;
      const d = c + 1;

      indices.push(a, b, c);
      indices.push(b, d, c);
    }
  }

  // 创建 Geometry（用 let，因为后面要重新赋值）
  let geometry = new Cesium.Geometry({
    attributes: {
      // 笛卡尔积坐标
      position: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.DOUBLE, // 必须 DOUBLE
        componentsPerAttribute: 3,
        values: new Float64Array(vertices),
      }),
      // 纹理坐标，告诉渲染器如何映射纹理
      st: new Cesium.GeometryAttribute({
        componentDatatype: Cesium.ComponentDatatype.FLOAT,
        componentsPerAttribute: 2,
        values: new Float32Array(uvs),
      }),
    },
    // 三角点坐标
    indices: new Uint32Array(indices),
    primitiveType: Cesium.PrimitiveType.TRIANGLES,
    boundingSphere: Cesium.BoundingSphere.fromVertices(new Float64Array(vertices)),
  });

  const originalPositions = geometry.attributes.position.values;
  console.log(geometry)
  // 检查 position 属性
  if (!geometry.attributes.position) {
    throw new Error("position attribute missing in geometry");
  }

  // 生成 position3DHigh / position3DLow
  geometry = Cesium.GeometryPipeline.encodeAttribute(
    geometry,
    "position",
    "position3DHigh",
    "position3DLow"
  );
  geometry.attributes.position = new Cesium.GeometryAttribute({
    componentDatatype: Cesium.ComponentDatatype.DOUBLE,
    componentsPerAttribute: 3,
    values: originalPositions,
  });
  // 材质
  const material = new Cesium.Material({
    fabric: {
      type: "Color",
      uniforms: {
        color: Cesium.Color.WHITE.withAlpha(0.8) // 这里换成你需要的颜色
      }
    }
  });

  // 创建 Primitive
  const terrainPrimitive = new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: geometry,
    }),
    appearance: new Cesium.MaterialAppearance({
      material: material,
      vertexFormat: Cesium.VertexFormat.ALL,
    }),
    asynchronous: false,
  });

  viewer.scene.primitives.add(terrainPrimitive);
  // 计算 Primitive 的中心
  const boundingSphere = Cesium.BoundingSphere.fromVertices(new Float64Array(vertices));
  const primitiveCenter = boundingSphere.center;

  // 定义相机偏移（可以随意调节旋转半径和高度）
  const offset = new Cesium.Cartesian3(0.0, -boundingSphere.radius * 3.0, boundingSphere.radius * 2.0);

  viewer.camera.lookAt(primitiveCenter, offset);
}
readGeoTif();