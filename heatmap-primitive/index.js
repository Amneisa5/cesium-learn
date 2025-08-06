(function () {
  Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkYWNmOTc1NC02N2U0LTQzZGMtOGRhNC1lOTJjNjFiMWIzZjgiLCJpZCI6MTMzMzE0LCJpYXQiOjE3MTM4NDk4NzJ9.uIiDvn99Slv79KZrGoMizfV3hGvuWNZq3c_50IRXE-c'
  resizeWindow();
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
  let position = Cesium.Cartesian3.fromDegrees(114, 34.5, 100000);
  let boxHeight = 100000;
  viewer.camera.lookAt(position, new Cesium.HeadingPitchRange(0, 0, boxHeight));
  createHeatMapPrimitive(viewer);
})()
function createHeatMapPrimitive (viewer) {
  let panelParam = {
    bounds: [113, 34, 115, 35],
    groundHeight: 100000,
    currHeight: 100,
    densityX: 100,
    densityY: 50,
    randomNum: 200,
    opacity: 0.9,
    viewer: viewer,
    colors: {
      "0.0": "#A0A5F0",
      "0.1": "blue",
      "0.45": "green",
      "0.65": "yellow",
      "0.8": "orange",
      "0.95": "red",
    },
    useDrawCommand: true
  };
  let currBounds = panelParam.bounds;
  let data = [];
  for (let i = 0; i < panelParam.randomNum; i++) {
    let x = Math.random() * (currBounds[2] - currBounds[0]) + currBounds[0];
    let y = Math.random() * (currBounds[3] - currBounds[1]) + currBounds[1];
    let value = Math.random() * 100;
    data.push({ lon: x, lat: y, value: value });
  }
  let heatmap;
  if (panelParam.useDrawCommand) {
    heatmap = viewer.scene.primitives.add(new HeatmapPrimitive(data, panelParam));
  } else {
    heatmap = new HeatmapPrimitive(data, panelParam);
  }
}
function resizeWindow () {
  function setDivHeight () {
    var div = document.getElementById('map');
    div.style.height = window.innerHeight + 'px';
  }

  window.onload = setDivHeight;

  window.addEventListener('resize', setDivHeight);
}