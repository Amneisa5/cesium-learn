import CanvasWindy from "./CanvasWindy.js";
import CanvasWindyHeight from "./CanvasWindyHeight.js";

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
    // terrain: undefined,
    // 不加载地球底图
    // imageryProvider: true,
    // 不加载地形
    // terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    // 背景透明
    skyBox: false,
    skyAtmosphere: false,
    backgroundColor: Cesium.Color.TRANSPARENT,
    baseLayerPicker: false,
    geocoder: false,
  });

const windCanvas = document.getElementById("windyCanvas");

// Transform wind data to CanvasWindy format
function transformWindData (rawData) {
  // Check if it's an array with 2 items (u-wind and v-wind)
  if (Array.isArray(rawData) && rawData.length >= 2) {
    const uItem = rawData[0]; // U-wind data
    const vItem = rawData[1]; // V-wind data

    // Both should have header, use the first one
    if (uItem.header && vItem.header) {
      const header = uItem.header;
      return {
        xmin: header.lo1,
        xmax: header.lo2,
        ymin: header.la2,
        ymax: header.la1,
        cols: header.nx,
        rows: header.ny,
        udata: uItem.data,
        vdata: vItem.data
      };
    }
  }

  // Fallback to original data
  console.warn('Unexpected wind data format');
  return rawData;
}

fetch("wind.json").then((res) => res.json()).then((res) => {
  console.log('Raw wind data:', res);
  const transformedData = transformWindData(res);
  console.log('Transformed wind data:', transformedData);

  // Set initial camera position to show 3D effect with smooth fly animation
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      (transformedData.xmin + transformedData.xmax) / 2,
      (transformedData.ymin + transformedData.ymax) / 2,
      3000000 // 3 million meters (3000km) height - better for viewing 3D effect
    ),
    orientation: {
      heading: Cesium.Math.toRadians(0),  // 0 degrees
      pitch: Cesium.Math.toRadians(-35),  // Look down at 35 degrees to show height variation
      roll: 0.0
    },
    duration: 2.0 // 2 second smooth transition
  });

  windCanvas.style.position = 'fixed';
  windCanvas.style['pointer-events'] = 'none';
  windCanvas.style['z-index'] = 10;
  windCanvas.style['top'] = 0;
  windCanvas.width = window.innerWidth;
  windCanvas.height = window.innerHeight;

  // let windy = new CanvasWindy(transformedData, {
  //   viewer: viewer,
  //   canvas: windCanvas,
  //   canvasWidth: window.innerWidth,
  //   canvasHeight: window.innerHeight,
  //   speedRate: 30000,
  //   particlesNumber: window.vector == '3' ? 10000 : 5000,
  //   maxAge: 60,
  //   frameRate: 100,
  //   color: window.vector == '5' ? '#000' : '#fff',
  //   lineWidth: 1,
  // })

  let windyHeight = new CanvasWindyHeight(transformedData, {
    viewer: viewer,
    canvas: windCanvas,
    canvasWidth: window.innerWidth,
    canvasHeight: window.innerHeight,
    speedRate: 30000,
    particlesNumber: window.vector == '3' ? 10000 : 5000,
    maxAge: 60,
    frameRate: 100,
    color: window.vector == '5' ? '#000' : '#fff',
    lineWidth: 1,
  })

  // Optional: Add slow camera rotation to show the 3D effect
  let startTime = Date.now();
  function rotateCamera () {
    const elapsed = (Date.now() - startTime) / 1000;
    const heading = elapsed * 0.1; // Slow rotation, 0.1 rad per second

    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(
        (transformedData.xmin + transformedData.xmax) / 2,
        (transformedData.ymin + transformedData.ymax) / 2,
        2000000
      ),
      orientation: {
        heading: heading,
        pitch: Cesium.Math.toRadians(-45),
        roll: 0.0
      }
    });

    if (!viewer.isDestroyed) {
      requestAnimationFrame(rotateCamera);
    }
  }

  // Uncomment the line below to enable auto-rotation
  // rotateCamera();
})
