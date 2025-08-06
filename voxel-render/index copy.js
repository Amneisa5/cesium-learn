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

//texture 云噪声纹理

var detail_map
let uintData
let pro = Cesium.Resource.fetchArrayBuffer({

  url: " http://192.168.1.40:60838/voxel-render/texture.bin"//64*64*64 ,存储的是3d噪声纹理

}).then(data => {
  uintData = new Float32Array(data)
  initVoxelPrimitive(uintData);

})
function initVoxelPrimitive (data) {
  let size = 64
  this.viewModel = {
    steps: 200,
    threshold: 0.6
  }
  const gui = new dat.GUI()
  let f1 = gui.addFolder('perlin设置');
  f1.add(this.viewModel, 'threshold', 0, 1);
  f1.add(this.viewModel, 'steps', 0, 300);

  const options = {
    modelMatrix: primitive_modelMatrix,
    geometry: geometry,
    dim: dim,
    data: data,
    size: size,
  };

  const lxs = viewer.scene.primitives.add(
    new VoxelPrimitive(options)
  );
}
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