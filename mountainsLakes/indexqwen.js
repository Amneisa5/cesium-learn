Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJkMDg0MzI2Ni0wMGI3LTQyOTYtOGM1Zi1iMTE4OTkxMTgyYzciLCJpZCI6MTc1MDE3LCJpYXQiOjE3NTQ5ODAxMTd9.Id_Wy_2_BUC537hz_sZlLTVbQ4i93qGgcR-Ro7X7qXA'
// ========== CustomPrimitive (简化版) ==========
class CustomPrimitive {
  constructor(options) {
    Object.assign(this, options);
    this.show = true;
  }
  update (frameState) {
    if (!this.show) return;
    if (!this.command) {
      const ctx = frameState.context;
      const va = Cesium.VertexArray.fromGeometry({
        context: ctx,
        geometry: this.geometry,
        attributeLocations: this.attributeLocations,
        bufferUsage: Cesium.BufferUsage.STATIC_DRAW,
      });
      const sp = Cesium.ShaderProgram.fromCache({
        context: ctx,
        vertexShaderSource: this.vertexShaderSource,
        fragmentShaderSource: this.fragmentShaderSource,
        attributeLocations: this.attributeLocations,
      });
      const rs = Cesium.RenderState.fromCache(this.rawRenderState || {});
      this.command = new Cesium.DrawCommand({
        owner: this,
        vertexArray: va,
        shaderProgram: sp,
        modelMatrix: this.modelMatrix || Cesium.Matrix4.IDENTITY,
        renderState: rs,
        pass: Cesium.Pass.OPAQUE,
      });
    }
    frameState.commandList.push(this.command);
  }
  isDestroyed () { return false; }
  destroy () { return Cesium.destroyObject(this); }
}

// ========== 加载 GeoTIFF ==========
const loadGeoTiff = async (url) => {
  const tiff = await GeoTIFF.fromUrl(url);
  const image = await tiff.getImage();
  const width = image.getWidth();
  const height = image.getHeight();
  const data = await image.readRasters({ interleave: true });
  return { width, height, data: data[0] || data }; // 单波段
};

// ========== 主程序 ==========
const viewer = new Cesium.Viewer("map", {
  imageryProvider: false,
  terrainProvider: new Cesium.EllipsoidTerrainProvider(),
  skyBox: false,
  skyAtmosphere: false,
  backgroundColor: Cesium.Color.BLACK,
  infoBox: false,
  timeline: false,
  animation: false,
  baseLayerPicker: false,
  sceneModePicker: false,
});

const init = async () => {
  try {
    // 1. 加载 GeoTIFF
    const { width, height, data } = await loadGeoTiff("gebco_2023_n32.5_s30.0_w120.0_e123.5.tif");
    console.log("GeoTIFF loaded:", width, "x", height);
    const heightData = new Float32Array(width * height);
    // 2. 归一化高程到 [0, 1]
    // 正确的高程数据归一化（避免内存溢出）
    let minH = heightData[0];
    let maxH = heightData[0];

    // 循环遍历找到最小值和最大值
    for (let i = 1; i < heightData.length; i++) {
      if (heightData[i] < minH) minH = heightData[i];
      if (heightData[i] > maxH) maxH = heightData[i];
    }
    const range = maxH - minH;
    const scale = range > 0 ? 1.0 / range : 1.0;

    for (let i = 0; i < heightData.length; i++) {
      heightData[i] = (heightData[i] - minH) * scale;
    }
    // 3. 创建高度纹理 (R32F)
    const heightTexture = new Cesium.Texture({
      context: viewer.scene.context,
      width: width,
      height: height,
      pixelFormat: Cesium.PixelFormat.R32F,
      pixelDatatype: Cesium.PixelDatatype.FLOAT,
      source: { arrayBufferView: heightData },
      sampler: new Cesium.Sampler({
        wrapS: Cesium.TextureWrap.CLAMP_TO_EDGE,
        wrapT: Cesium.TextureWrap.CLAMP_TO_EDGE,
        minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
        magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
      }),
    });

    // 4. 创建 Fullscreen Quad（用于 raymarch）
    const quad = new Cesium.Geometry({
      attributes: new Cesium.GeometryAttributes({
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 3,
          values: new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]),
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]),
        }),
      }),
      indices: new Uint16Array([0, 1, 2, 0, 2, 3]),
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
    });
    const attrLocs = Cesium.GeometryPipeline.createAttributeLocations(quad);

    // 5. Shader
    const vs = new Cesium.ShaderSource({
      sources: [`
            in vec3 position;
            in vec2 st;
            out vec2 v_st;
            void main() {
              v_st = st;
              gl_Position = czm_projection * czm_view * czm_model * vec4(position, 1.0);
            }
          `]
    });

    const fs = new Cesium.ShaderSource({
      sources: [`
            precision highp float;
            uniform sampler2D u_heightMap;
            uniform vec2 u_resolution;
            in vec2 v_st;

            // Box intersection
            vec2 intersectBox(vec3 ro, vec3 rd) {
              vec3 t1 = (-0.5 - ro) / rd;
              vec3 t2 = ( 0.5 - ro) / rd;
              vec3 tmin = min(t1, t2);
              vec3 tmax = max(t1, t2);
              float t0 = max(tmin.x, max(tmin.y, tmin.z));
              float t1v = min(tmax.x, min(tmax.y, tmax.z));
              if (t0 > t1v || t1v < 0.0) return vec2(-1.0);
              return vec2(t0, t1v);
            }

            float getHeight(vec2 uv) {
              // Flip Y for GeoTIFF
              uv.y = 1.0 - uv.y;
              return texture(u_heightMap, uv).r;
            }

            void main() {
              vec2 uv = v_st;
              vec3 ro = vec3(0.0, 0.0, 2.0); // camera
              vec3 rd = normalize(vec3(uv * 2.0 - 1.0, -1.0));

              vec2 tHit = intersectBox(ro, rd);
              if (tHit.x > tHit.y) discard;

              // Raymarch terrain
              float t = tHit.x;
              float maxT = tHit.y;
              vec3 p = ro + rd * t;
              float h = getHeight(p.xz * 0.5 + 0.5); // map [-0.5,0.5] → [0,1]

              // Simple hit
              if (p.y <= h) {
                // Normal approximation
                vec3 eps = vec3(0.001, 0.0, 0.0);
                float hx = getHeight((p + eps.xzz).xz * 0.5 + 0.5);
                float hy = getHeight((p + eps.zxz).xz * 0.5 + 0.5);
                vec3 n = normalize(vec3(h - hx, eps.x, h - hy));

                // Lighting
                vec3 light = normalize(vec3(1, 1, 1));
                float diff = max(0.2, dot(n, light));
                vec3 col = vec3(0.2, 0.5, 0.1) * diff;
                out_FragColor = vec4(col, 1.0);
              } else {
                discard;
              }
            }
          `]
    });

    // 6. 创建 Primitive
    const terrainPrim = new CustomPrimitive({
      geometry: quad,
      attributeLocations: attrLocs,
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      uniformMap: {
        u_heightMap: () => heightTexture,
        u_resolution: () => new Cesium.Cartesian2(width, height),
      },
      rawRenderState: {
        depthTest: { enabled: true },
        depthMask: true,
      },
    });

    viewer.scene.primitives.add(terrainPrim);

    // 7. 相机定位
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(121.75, 31.25, 50000),
      orientation: { heading: Cesium.Math.toRadians(0), pitch: Cesium.Math.toRadians(-45), roll: 0 }
    });

  } catch (e) {
    console.error("Error:", e);
  }
};

window.addEventListener("DOMContentLoaded", init);