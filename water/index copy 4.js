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
    // Explicitly disable terrain by setting it to undefined
    terrain: undefined,
  });

// 确保地形提供者也被设置为undefined以完全禁用地形
viewer.scene.terrainProvider = undefined;

// 创建一个立方体几何体而不是矩形
var boxGeometry = new Cesium.BoxGeometry({
  vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL,
  maximum: new Cesium.Cartesian3(5000.0, 6000.0, 10000.0), // 半尺寸
  minimum: new Cesium.Cartesian3(-5000.0, -6000.0, 0.0)
});

// 创建几何体实例，并设置水体颜色
var boxInstance = new Cesium.GeometryInstance({
  geometry: boxGeometry,
  modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(118.75, 32.05, 0) // 立方体中心位置
  ),
  attributes: {
    // 修改颜色为水体颜色（蓝色半透明）
    color: Cesium.ColorGeometryInstanceAttribute.fromColor(new Cesium.Color(0.2, 0.6, 1.0, 0.6))
  }
});

// 设置透明和封闭属性
var boxPrimitive = new Cesium.Primitive({
  geometryInstances: [boxInstance],
  appearance: new Cesium.PerInstanceColorAppearance({
    translucent: true,
    closed: true
  })
});

viewer.scene.primitives.add(boxPrimitive);

// 添加一些浮标效果 - 使用球体几何体创建简单的浮标
var buoyPositions = [
  [118.79, 32.03, 0],
  [118.75, 32.01, 0],
  [118.74, 32.05, 0],
  [118.70, 32.09, 0]
];

var buoyPrimitives = [];

for (var i = 0; i < buoyPositions.length; i++) {
  var position = buoyPositions[i];
  var sphereGeometry = new Cesium.SphereGeometry({
    radius: 200.0,
    vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL
  });
  let randomHeight = 5000 + Math.random() * 1000;
  var sphereInstance = new Cesium.GeometryInstance({
    geometry: sphereGeometry,
    modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
      Cesium.Cartesian3.fromDegrees(position[0], position[1], position[2] + randomHeight) // 稍微高出水面
    ),
    attributes: {
      color: Cesium.ColorGeometryInstanceAttribute.fromColor(Cesium.Color.RED)
    }
  });

  var spherePrimitive = new Cesium.Primitive({
    geometryInstances: [sphereInstance],
    appearance: new Cesium.PerInstanceColorAppearance({
      translucent: false,
      closed: true
    })
  });

  viewer.scene.primitives.add(spherePrimitive);
  buoyPrimitives.push(spherePrimitive);

  viewer.entities.add({
    position: Cesium.Cartesian3.fromDegrees(position[0], position[1], position[2] + randomHeight),
    label: {
      text: 'Buoy ' + (i + 1),
      font: '14px sans-serif',
      fillColor: Cesium.Color.WHITE,
      outlineColor: Cesium.Color.BLACK,
      outlineWidth: 2,
    }
  })
}

// 设置相机位置以便观察立方体
viewer.camera.setView({
  destination: Cesium.Cartesian3.fromDegrees(118.76, 32.06, 15000),
  orientation: {
    heading: Cesium.Math.toRadians(0),
    pitch: Cesium.Math.toRadians(-45),
    roll: 0.0
  }
});

// 添加相机.lookAt函数确保相机观察中心对准盒子中心
var boxCenter = Cesium.Cartesian3.fromDegrees(118.76, 32.06, 0);
var cameraPosition = Cesium.Cartesian3.fromDegrees(118.76, 32.06, 15000);
viewer.camera.lookAt(boxCenter, new Cesium.Cartesian3(0.0, -10000.0, 5000.0));
const readGeoTif = async () => {
  const terrain = "agri-small-dem.tif";
  const rawTiff = await GeoTIFF.fromUrl(terrain);
  const tifImage = await rawTiff.getImage();

  const width = tifImage.getWidth();
  const height = tifImage.getHeight();

  const data = await tifImage.readRasters({ interleave: true });

  const vertices = [];
  const uvs = [];
  const indices = [];

  const heights = []
  const lats = [];
  const lons = [];

  // 顶点坐标 + UV
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      const lon = 118.7 + (x / width) * 0.1;
      const lat = 32.0 + (y / height) * 0.1;
      const h = data[index] - 1500;
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
  // ======================
  // 生成墙体数据
  // ======================
  let baseHeight = 0;
  let wallPositions = [];
  let minHeights = [];
  let maxHeights = [];

  // 左边边界
  for (let y = 0; y < height; y++) {
    const height = heights[y * width];
    wallPositions.push(lons[y * width], lats[y * width]);
    minHeights.push(baseHeight);
    maxHeights.push(height);
  }

  // 下边边界
  for (let x = 1; x < width; x++) {
    const h = heights[(height - 1) * width + x];
    wallPositions.push(lons[(height - 1) * width + x], lats[(height - 1) * width + x]);
    minHeights.push(baseHeight);
    maxHeights.push(h);
  }
  // 右边边界
  for (let y = height - 2; y >= 0; y--) {
    const idx = y * width + (width - 1);
    const height = heights[idx];
    wallPositions.push(lons[idx], lats[idx]);
    minHeights.push(baseHeight);
    maxHeights.push(height);
  }
  // 上边边界
  for (let x = width - 2; x > 0; x--) {
    const height = heights[x];
    wallPositions.push(lons[x], lats[x]);
    minHeights.push(baseHeight);
    maxHeights.push(height);
  }

  viewer.entities.add({
    wall: {
      positions: Cesium.Cartesian3.fromDegreesArray(wallPositions),
      minimumHeights: minHeights,
      maximumHeights: maxHeights,
      material: new Cesium.ImageMaterialProperty({
        image: "agri-small-autumn.jpg",
        repeat: new Cesium.Cartesian2(1, 1)
      })
    }
  });
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
      type: "Image",
      uniforms: {
        image: "agri-small-autumn.jpg"
      },
    },
  });

  // 创建 Primitive
  const terrainPrimitive = new Cesium.Primitive({
    geometryInstances: new Cesium.GeometryInstance({
      geometry: geometry,
    }),
    appearance: new Cesium.MaterialAppearance({
      material: material,
      vertexFormat: Cesium.VertexFormat.POSITION_AND_ST,
    }),
    asynchronous: false,
  });

  viewer.scene.primitives.add(terrainPrimitive);


}
readGeoTif();