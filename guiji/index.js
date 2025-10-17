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
    // 不加载地球底图
    imageryProvider: false,
    // 不加载地形
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    // 背景透明
    skyBox: false,
    skyAtmosphere: false,
    backgroundColor: Cesium.Color.TRANSPARENT,
    baseLayerPicker: false,
    geocoder: false,
  });
const init = () => {

}
window.addEventListener("DOMContentLoaded", () => {
  init();
})