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
let viewModel = {
  zIndex: 6,

}
// 创建dat.GUI实例
var gui = new dat.GUI();

let f = gui.addFolder('zIndex设置');
f.add(viewModel, 'zIndex', 0, 8).onChange(changeIndex);
f.open();
function changeIndex () {
}
function ProceduralSingleTileVoxelProvider (shape) {
  this.shape = shape;
  this.minBounds = Cesium.VoxelShapeType.getMinBounds(shape).clone();
  this.maxBounds = Cesium.VoxelShapeType.getMaxBounds(shape).clone();
  this.dimensions = new Cesium.Cartesian3(8, 8, viewModel.zIndex);
  this.names = ["color"];
  this.types = [Cesium.MetadataType.VEC4];
  this.componentTypes = [Cesium.MetadataComponentType.FLOAT32];
}

const scratchColor = new Cesium.Color();

ProceduralSingleTileVoxelProvider.prototype.requestData = function (options) {
  if (options.tileLevel >= 1) {
    return undefined;
  }
  const dimensions = this.dimensions;
  const voxelCount = dimensions.x * dimensions.y * Math.ceil(viewModel.zIndex);
  const type = this.types[0];
  const channelCount = Cesium.MetadataType.getComponentCount(type);
  const dataColor = new Float32Array(voxelCount * channelCount);

  const randomSeed = dimensions.y * dimensions.x + dimensions.x;
  Cesium.Math.setRandomNumberSeed(randomSeed);
  const hue = Cesium.Math.nextRandomNumber();

  for (let z = 0; z < Math.ceil(viewModel.zIndex); z++) {
    for (let y = 0; y < dimensions.y; y++) {
      const indexZY = z * dimensions.y * dimensions.x + y * Math.ceil(viewModel.zIndex);
      for (let x = 0; x < dimensions.x; x++) {
        const lerperX = x / (dimensions.x - 1);
        const lerperY = y / (dimensions.y - 1);
        const lerperZ = z / (Math.ceil(viewModel.zIndex) - 1);

        const h = hue + lerperX * 0.5 - lerperY * 0.3 + lerperZ * 0.2;
        const s = 1.0 - lerperY * 0.2;
        const v = 0.5 + 2.0 * (lerperZ - 0.5) * 0.2;
        const color = Cesium.Color.fromHsl(h, s, v, 1.0, scratchColor);

        const index = (indexZY + x) * channelCount;
        dataColor[index + 0] = color.red;
        dataColor[index + 1] = color.green;
        dataColor[index + 2] = color.blue;
        dataColor[index + 3] = 0.75;
      }
    }
  }
  return Promise.resolve([dataColor]);
};
// function ProceduralMultiTileVoxelProvider (shape) {
//   this.shape = shape;
//   this.minBounds = Cesium.VoxelShapeType.getMinBounds(shape).clone();
//   this.maxBounds = Cesium.VoxelShapeType.getMaxBounds(shape).clone();
//   this.dimensions = new Cesium.Cartesian3(4, 4, 4);
//   this.paddingBefore = new Cesium.Cartesian3(1, 1, 1);
//   this.paddingAfter = new Cesium.Cartesian3(1, 1, 1);
//   this.names = ["color"];
//   this.types = [Cesium.MetadataType.VEC4];
//   this.componentTypes = [Cesium.MetadataComponentType.FLOAT32];

//   this._levelCount = 2;
//   this._allVoxelData = new Array(this._levelCount);

//   const allVoxelData = this._allVoxelData;
//   const channelCount = Cesium.MetadataType.getComponentCount(this.types[0]);
//   const { dimensions } = this;

//   for (let level = 0; level < this._levelCount; level++) {
//     const dimAtLevel = Math.pow(2, level);
//     const voxelCountX = dimensions.x * dimAtLevel;
//     const voxelCountY = dimensions.y * dimAtLevel;
//     const voxelCountZ = dimensions.z * dimAtLevel;
//     const voxelsPerLevel = voxelCountX * voxelCountY * voxelCountZ;
//     const levelData = (allVoxelData[level] = new Array(
//       voxelsPerLevel * channelCount,
//     ));

//     for (let z = 0; z < voxelCountX; z++) {
//       for (let y = 0; y < voxelCountY; y++) {
//         const indexZY = z * voxelCountY * voxelCountX + y * voxelCountX;
//         for (let x = 0; x < voxelCountZ; x++) {
//           const index = (indexZY + x) * channelCount;
//           levelData[index + 0] = x / (voxelCountX - 1);
//           levelData[index + 1] = y / (voxelCountY - 1);
//           levelData[index + 2] = z / (voxelCountZ - 1);
//           levelData[index + 3] = 0.5;
//         }
//       }
//     }
//   }
// }

// ProceduralMultiTileVoxelProvider.prototype.requestData = function (options) {
//   const { tileLevel, tileX, tileY, tileZ } = options;

//   if (tileLevel >= this._levelCount) {
//     return undefined;
//   }

//   const type = this.types[0];
//   const channelCount = Cesium.MetadataType.getComponentCount(type);
//   const { dimensions, paddingBefore, paddingAfter } = this;
//   const paddedDimensions = Cesium.Cartesian3.fromElements(
//     dimensions.x + paddingBefore.x + paddingAfter.x,
//     dimensions.y + paddingBefore.y + paddingAfter.y,
//     dimensions.z + paddingBefore.z + paddingAfter.z,
//   );
//   const dimAtLevel = Math.pow(2, tileLevel);
//   const dimensionsGlobal = Cesium.Cartesian3.fromElements(
//     dimensions.x * dimAtLevel,
//     dimensions.y * dimAtLevel,
//     dimensions.z * dimAtLevel,
//   );
//   const minimumGlobalCoord = Cesium.Cartesian3.ZERO;
//   const maximumGlobalCoord = new Cesium.Cartesian3(
//     dimensionsGlobal.x - 1,
//     dimensionsGlobal.y - 1,
//     dimensionsGlobal.z - 1,
//   );
//   let coordGlobal = new Cesium.Cartesian3();

//   const dataGlobal = this._allVoxelData;
//   const dataTile = new Float32Array(
//     paddedDimensions.x * paddedDimensions.y * paddedDimensions.z * channelCount,
//   );

//   for (let z = 0; z < paddedDimensions.z; z++) {
//     const indexZ = z * paddedDimensions.y * paddedDimensions.x;
//     for (let y = 0; y < paddedDimensions.y; y++) {
//       const indexZY = indexZ + y * paddedDimensions.x;
//       for (let x = 0; x < paddedDimensions.x; x++) {
//         const indexTile = indexZY + x;

//         coordGlobal = Cesium.Cartesian3.clamp(
//           Cesium.Cartesian3.fromElements(
//             tileX * dimensions.x + (x - paddingBefore.x),
//             tileY * dimensions.y + (y - paddingBefore.y),
//             tileZ * dimensions.z + (z - paddingBefore.z),
//             coordGlobal,
//           ),
//           minimumGlobalCoord,
//           maximumGlobalCoord,
//           coordGlobal,
//         );

//         const indexGlobal =
//           coordGlobal.z * dimensionsGlobal.y * dimensionsGlobal.x +
//           coordGlobal.y * dimensionsGlobal.x +
//           coordGlobal.x;

//         for (let c = 0; c < channelCount; c++) {
//           dataTile[indexTile * channelCount + c] =
//             dataGlobal[tileLevel][indexGlobal * channelCount + c];
//         }
//       }
//     }
//   }
//   return Promise.resolve([dataTile]);
// };

class ProceduralMultiTileVoxelProvider {
  constructor(shape) {
    this.shape = shape;
    this.minBounds = Cesium.VoxelShapeType.getMinBounds(shape).clone();
    this.maxBounds = Cesium.VoxelShapeType.getMaxBounds(shape).clone();
    this.dimensions = new Cesium.Cartesian3(4, 4, 4);
    this.paddingBefore = new Cesium.Cartesian3(1, 1, 1);
    this.paddingAfter = new Cesium.Cartesian3(1, 1, 1);
    this.names = ["color"];
    this.types = [Cesium.MetadataType.VEC4];
    this.componentTypes = [Cesium.MetadataComponentType.FLOAT32];

    this._levelCount = 2;
    this._allVoxelData = new Array(this._levelCount);

    const allVoxelData = this._allVoxelData;
    const channelCount = Cesium.MetadataType.getComponentCount(this.types[0]);
    const { dimensions } = this;

    for (let level = 0; level < this._levelCount; level++) {
      const dimAtLevel = Math.pow(2, level);
      const voxelCountX = dimensions.x * dimAtLevel;
      const voxelCountY = dimensions.y * dimAtLevel;
      const voxelCountZ = dimensions.z * dimAtLevel;
      const voxelsPerLevel = voxelCountX * voxelCountY * voxelCountZ;
      const levelData = (allVoxelData[level] = new Array(
        voxelsPerLevel * channelCount,
      ));

      for (let z = 0; z < voxelCountX; z++) {
        for (let y = 0; y < voxelCountY; y++) {
          const indexZY = z * voxelCountY * voxelCountX + y * voxelCountX;
          for (let x = 0; x < voxelCountZ; x++) {
            const index = (indexZY + x) * channelCount;
            levelData[index + 0] = x / (voxelCountX - 1);
            levelData[index + 1] = y / (voxelCountY - 1);
            levelData[index + 2] = z / (voxelCountZ - 1);
            levelData[index + 3] = 0.5;
          }
        }
      }
    }
  }
  requestData (options) {
    const { tileLevel, tileX, tileY, tileZ } = options;
    if (tileLevel >= this._levelCount) {
      return undefined;
    }
    const type = this.types[0];
    const channelCount = Cesium.MetadataType.getComponentCount(type);
    const { dimensions, paddingBefore, paddingAfter } = this;
    const paddedDimensions = Cesium.Cartesian3.fromElements(
      dimensions.x + paddingBefore.x + paddingAfter.x,
      dimensions.y + paddingBefore.y + paddingAfter.y,
      dimensions.z + paddingBefore.z + paddingAfter.z,
    );
    const dimAtLevel = Math.pow(2, tileLevel);
    const dimensionsGlobal = Cesium.Cartesian3.fromElements(
      dimensions.x * dimAtLevel,
      dimensions.y * dimAtLevel,
      dimensions.z * dimAtLevel,
    );
    const minimumGlobalCoord = Cesium.Cartesian3.ZERO;
    const maximumGlobalCoord = new Cesium.Cartesian3(
      dimensionsGlobal.x - 1,
      dimensionsGlobal.y - 1,
      dimensionsGlobal.z - 1,
    );
    let coordGlobal = new Cesium.Cartesian3();

    const dataGlobal = this._allVoxelData;
    const dataTile = new Float32Array(
      paddedDimensions.x * paddedDimensions.y * paddedDimensions.z * channelCount,
    );

    for (let z = 0; z < paddedDimensions.z; z++) {
      const indexZ = z * paddedDimensions.y * paddedDimensions.x;
      for (let y = 0; y < paddedDimensions.y; y++) {
        const indexZY = indexZ + y * paddedDimensions.x;
        for (let x = 0; x < paddedDimensions.x; x++) {
          const indexTile = indexZY + x;

          coordGlobal = Cesium.Cartesian3.clamp(
            Cesium.Cartesian3.fromElements(
              tileX * dimensions.x + (x - paddingBefore.x),
              tileY * dimensions.y + (y - paddingBefore.y),
              tileZ * dimensions.z + (z - paddingBefore.z),
              coordGlobal,
            ),
            minimumGlobalCoord,
            maximumGlobalCoord,
            coordGlobal,
          );

          const indexGlobal =
            coordGlobal.z * dimensionsGlobal.y * dimensionsGlobal.x +
            coordGlobal.y * dimensionsGlobal.x +
            coordGlobal.x;

          for (let c = 0; c < channelCount; c++) {
            dataTile[indexTile * channelCount + c] =
              dataGlobal[tileLevel][indexGlobal * channelCount + c];
          }
        }
      }
    }
    return Promise.resolve([dataTile]);
  }
}
function createPrimitive (provider, customShader, modelMatrix) {
  viewer.scene.primitives.removeAll();

  const voxelPrimitive = viewer.scene.primitives.add(
    new Cesium.VoxelPrimitive({
      provider: provider,
      customShader: customShader,
      modelMatrix: modelMatrix,
    }),
  );

  // viewer.voxelInspector.viewModel.voxelPrimitive = voxelPrimitive;
  viewer.camera.flyToBoundingSphere(voxelPrimitive.boundingSphere, {
    duration: 0.0,
  });

  return voxelPrimitive;
}
const customShaderColor = new Cesium.CustomShader({
  fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
  {
      material.diffuse = fsInput.metadata.color.rgb;
      float transparency = 1.0 - fsInput.metadata.color.a;

      // To mimic light scattering, use exponential decay
      float thickness = fsInput.voxel.travelDistance * 16.0;
      material.alpha = 1.0 - pow(transparency, thickness);
  }`,
});

const customShaderWhite = new Cesium.CustomShader({
  fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
  {
      material.diffuse = vec3(1.0);
      material.alpha = 1.0;
  }`,
});
const customShader = new Cesium.CustomShader({
  fragmentShaderText: `void fragmentMain(FragmentInput fsInput, inout czm_modelMaterial material)
    {
        vec3 cellColor = fsInput.metadata.color.rgb; //获取元数据 color

        //TODO: 如果元数据不是颜色，则在这里继续实现从获取元数据到颜色的转换处理

        material.diffuse = cellColor;
        material.alpha = 1.0;
    }`,
});

// const modelMatrix =
//   Cesium.Matrix4.multiplyByTranslation(
//     Cesium.Transforms.eastNorthUpToFixedFrame(
//       Cesium.Cartesian3.fromDegrees(106.642372689378, 26.623450331223),
//     ),
//     new Cesium.Cartesian3(0.0, 0.0, 80.0),
//     new Cesium.Matrix4()
//   );
// const provider = new ProceduralSingleTileVoxelProvider(
//   Cesium.VoxelShapeType.BOX,
// );
// const primitive = createPrimitive(provider, customShaderColor, modelMatrix);
// viewer.scene.primitives.add(
//   new Cesium.DebugModelMatrixPrimitive({
//     modelMatrix: modelMatrix,
//     length: 3.0,
//     width: 1.0,
//   }),
// );
// viewer.scene.camera.lookAt(Cesium.Cartesian3.fromDegrees(106.642372689378, 26.623450331223, 80.0), new Cesium.Cartesian3(2, 2, 2));
const provider = new ProceduralMultiTileVoxelProvider(
  Cesium.VoxelShapeType.BOX
);
const modelMatrix = Cesium.Matrix4.multiplyByTranslation(
  Cesium.Transforms.eastNorthUpToFixedFrame(
    Cesium.Cartesian3.fromDegrees(106.642372689378, 26.623450331223)
  ),
  new Cesium.Cartesian3(0.0, 0.0, 200000.0),
  new Cesium.Matrix4()
);
// const modelMatrix = Cesium.Transforms.eastNorthUpToFixedFrame(
//   Cesium.Cartesian3.fromDegrees(106.642372689378, 26.623450331223)
// );

// const modelMatrix = Cesium.Matrix4.fromScale(
//   Cesium.Cartesian3.fromElements(
//     Cesium.Ellipsoid.WGS84.maximumRadius,
//     Cesium.Ellipsoid.WGS84.maximumRadius,
//     Cesium.Ellipsoid.WGS84.maximumRadius,
//   ),
// );
const voxelPrimitive = viewer.scene.primitives.add(
  new Cesium.VoxelPrimitive({
    provider: provider,
    customShader: customShader,
    modelMatrix: modelMatrix,
  })
);


const localTransformParams = new Cesium.TranslationRotationScale(
  new Cesium.Cartesian3(0, 0, 1000),
  null,
  new Cesium.Cartesian3(100000, 100000, 100000)
);
const localTransform =
  Cesium.Matrix4.fromTranslationRotationScale(localTransformParams);
Cesium.Matrix4.multiply(modelMatrix, localTransform, modelMatrix);
viewer.scene.camera.lookAt(Cesium.Cartesian3.fromDegrees(106.642372689378, 26.623450331223, 200000.0), new Cesium.Cartesian3(2, 2, 2));
const primitive = createPrimitive(provider, customShaderColor, modelMatrix);
