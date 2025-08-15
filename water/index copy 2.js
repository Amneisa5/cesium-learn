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
    // terrain: Cesium.Terrain.fromWorldTerrain(),
  });

// 创建一个立方体几何体而不是矩形
var boxGeometry = new Cesium.BoxGeometry({
  vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL,
  maximum: new Cesium.Cartesian3(5000.0, 5000.0, 10000.0), // 半尺寸
  minimum: new Cesium.Cartesian3(-5000.0, -5000.0, 0.0)
});

// 创建几何体实例，并设置水体颜色
var boxInstance = new Cesium.GeometryInstance({
  geometry: boxGeometry,
  modelMatrix: Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(118.76, 32.06, 0) // 立方体中心位置
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
  [118.75, 32.05, 0],
  [118.77, 32.05, 0],
  [118.75, 32.07, 0],
  [118.77, 32.07, 0]
];

var buoyPrimitives = [];

for (var i = 0; i < buoyPositions.length; i++) {
  var position = buoyPositions[i];
  var sphereGeometry = new Cesium.SphereGeometry({
    radius: 200.0,
    vertexFormat: Cesium.VertexFormat.POSITION_AND_NORMAL
  });
  let randomHeight = Math.random() * 10000;
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
  let terrain = 'agri-small-dem.tif'
  const rawTiff = await GeoTIFF.fromUrl(terrain);
  const tifImage = await rawTiff.getImage();

  const data = await tifImage.readRasters({ interleave: true });
  console.log(data)
}
readGeoTif();