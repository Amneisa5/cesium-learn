/**
 * 流场粒子系统 - 与地形高程数据配合使用
 * 在地形最上层显示流场效果
 * 
 * 依赖：
 * - demo: 全局变量，在 index.html 中定义
 * - fileOptions: 全局变量，在 index.html 中定义
 * - Cesium-3D-Wind 库文件
 */

class WindParticleSystem {
  constructor(viewer, bounds, terrainHeight = 1000) {
    this.viewer = viewer;
    this.bounds = bounds; // { lonMin, lonMax, latMin, latMax }
    this.terrainHeight = terrainHeight; // 流场显示的高度（在地形之上）

    // 创建模拟的风场数据
    this.windData = this.createSimulatedWindData();

    // 初始化粒子系统
    this.initParticleSystem();
  }

  /**
   * 创建模拟的风场数据
   * 这里生成一个简单的流场模式
   */
  createSimulatedWindData () {
    const lonSteps = 50; // 经度方向采样点数
    const latSteps = 50; // 纬度方向采样点数
    const levSteps = 1;  // 高度层数（2D流场）

    const lonArray = [];
    const latArray = [];
    const levArray = [this.terrainHeight]; // 固定高度层
    const uArray = []; // 东西方向风速
    const vArray = []; // 南北方向风速

    // 生成经纬度网格
    for (let i = 0; i < lonSteps; i++) {
      const lon = this.bounds.lonMin + (this.bounds.lonMax - this.bounds.lonMin) * i / (lonSteps - 1);
      lonArray.push(lon);
    }

    for (let j = 0; j < latSteps; j++) {
      const lat = this.bounds.latMin + (this.bounds.latMax - this.bounds.latMin) * j / (latSteps - 1);
      latArray.push(lat);
    }

    // 生成流场数据 - 创建一个旋涡流场
    const centerLon = (this.bounds.lonMin + this.bounds.lonMax) / 2;
    const centerLat = (this.bounds.latMin + this.bounds.latMax) / 2;

    let uMin = Infinity, uMax = -Infinity;
    let vMin = Infinity, vMax = -Infinity;

    for (let k = 0; k < levSteps; k++) {
      for (let j = 0; j < latSteps; j++) {
        for (let i = 0; i < lonSteps; i++) {
          const lon = lonArray[i];
          const lat = latArray[j];

          // 计算相对于中心的位置
          const dx = (lon - centerLon) * Math.cos(centerLat * Math.PI / 180);
          const dy = lat - centerLat;
          const distance = Math.sqrt(dx * dx + dy * dy);

          // 创建旋涡流场 + 整体流动
          const angle = Math.atan2(dy, dx);
          const vortexStrength = 20 * Math.exp(-distance * 2); // 旋涡强度随距离衰减

          // 旋涡分量（逆时针旋转）
          const u_vortex = -vortexStrength * Math.sin(angle);
          const v_vortex = vortexStrength * Math.cos(angle);

          // 整体流动分量（从西向东）
          const u_flow = 10 + 5 * Math.sin(lat * 2);
          const v_flow = 3 * Math.cos(lon);

          // 合成
          const u = u_vortex + u_flow;
          const v = v_vortex + v_flow;

          uArray.push(u);
          vArray.push(v);

          uMin = Math.min(uMin, u);
          uMax = Math.max(uMax, u);
          vMin = Math.min(vMin, v);
          vMax = Math.max(vMax, v);
        }
      }
    }

    console.log("风场数据生成完成:");
    console.log("  经度范围:", this.bounds.lonMin, "到", this.bounds.lonMax, "°E");
    console.log("  纬度范围:", this.bounds.latMin, "到", this.bounds.latMax, "°N");
    console.log("  网格尺寸:", lonSteps, "x", latSteps, "x", levSteps);
    console.log("  U分量范围:", uMin.toFixed(2), "到", uMax.toFixed(2));
    console.log("  V分量范围:", vMin.toFixed(2), "到", vMax.toFixed(2));

    return {
      dimensions: {
        lon: lonSteps,
        lat: latSteps,
        lev: levSteps
      },
      lon: {
        array: new Float32Array(lonArray),
        min: this.bounds.lonMin,
        max: this.bounds.lonMax
      },
      lat: {
        array: new Float32Array(latArray),
        min: this.bounds.latMin,
        max: this.bounds.latMax
      },
      lev: {
        array: new Float32Array(levArray),
        min: this.terrainHeight,
        max: this.terrainHeight
      },
      U: {
        array: new Float32Array(uArray),
        min: uMin,
        max: uMax
      },
      V: {
        array: new Float32Array(vArray),
        min: vMin,
        max: vMax
      },
      colorTable: {
        colorNum: 16,
        array: new Float32Array([
          0.015686, 0.054902, 0.847059,
          0.125490, 0.313725, 1.000000,
          0.254902, 0.588235, 1.000000,
          0.427451, 0.756863, 1.000000,
          0.525490, 0.850980, 1.000000,
          0.611765, 0.933333, 1.000000,
          0.686275, 0.960784, 1.000000,
          0.807843, 1.000000, 1.000000,
          1.000000, 0.996078, 0.278431,
          1.000000, 0.921569, 0.000000,
          1.000000, 0.768627, 0.000000,
          1.000000, 0.564706, 0.000000,
          1.000000, 0.282353, 0.000000,
          1.000000, 0.000000, 0.000000,
          0.835294, 0.000000, 0.000000,
          0.619608, 0.000000, 0.000000
        ])
      }
    };
  }

  /**
   * 初始化粒子系统
   */
  initParticleSystem () {
    // 用户输入参数
    const maxParticles = 128 * 128;
    this.userInput = {
      maxParticles: maxParticles, // 粒子数量
      particlesTextureSize: Math.ceil(Math.sqrt(maxParticles)), // 粒子纹理大小
      particleHeight: this.terrainHeight,
      fadeOpacity: 0.996, // 轨迹淡出速度
      dropRate: 0.003,    // 粒子重置率
      dropRateBump: 0.01,
      speedFactor: 1.0,   // 速度因子
      lineWidth: 2.0      // 线宽
    };

    // 视图参数
    this.viewerParameters = {
      lonRange: new Cesium.Cartesian2(this.bounds.lonMin, this.bounds.lonMax),
      latRange: new Cesium.Cartesian2(this.bounds.latMin, this.bounds.latMax),
      pixelSize: 1.0,
      particleHeight: this.terrainHeight,
      lonDisplayRange: new Cesium.Cartesian2(this.bounds.lonMin, this.bounds.lonMax),
      latDisplayRange: new Cesium.Cartesian2(this.bounds.latMin, this.bounds.latMax)
    };

    // 创建粒子系统（需要 Cesium-3D-Wind 的 ParticleSystem 类）
    if (typeof ParticleSystem !== 'undefined') {
      this.particleSystem = new ParticleSystem(
        this.viewer.scene.context,
        this.windData,
        this.userInput,
        this.viewerParameters
      );

      // 添加到场景
      this.addToScene();

      console.log("粒子系统初始化完成，粒子数量:", this.userInput.maxParticles);
    } else {
      console.error("ParticleSystem 类未找到，请确保已加载 Cesium-3D-Wind 相关文件");
    }
  }

  /**
   * 将粒子系统添加到场景渲染循环
   */
  addToScene () {
    const that = this;

    console.log("🔧 开始添加粒子系统到场景...");
    console.log("  - particlesComputing:", this.particleSystem.particlesComputing);
    console.log("  - particlesRendering:", this.particleSystem.particlesRendering);

    // 添加计算primitives
    this.viewer.scene.primitives.add(this.particleSystem.particlesComputing.primitives.calculateSpeed);
    console.log("  ✓ calculateSpeed 已添加");

    this.viewer.scene.primitives.add(this.particleSystem.particlesComputing.primitives.updatePosition);
    console.log("  ✓ updatePosition 已添加");

    this.viewer.scene.primitives.add(this.particleSystem.particlesComputing.primitives.postProcessingPosition);
    console.log("  ✓ postProcessingPosition 已添加");

    // 添加渲染primitives
    this.viewer.scene.primitives.add(this.particleSystem.particlesRendering.primitives.segments);
    console.log("  ✓ segments 已添加");

    this.viewer.scene.primitives.add(this.particleSystem.particlesRendering.primitives.trails);
    console.log("  ✓ trails 已添加");

    this.viewer.scene.primitives.add(this.particleSystem.particlesRendering.primitives.screen);
    console.log("  ✓ screen 已添加");

    console.log("✅ 粒子系统已完全添加到场景");

    // 检查primitives的可见性
    console.log("🔍 检查primitives状态:");
    console.log("  - segments.show:", this.particleSystem.particlesRendering.primitives.segments.show);
    console.log("  - trails.show:", this.particleSystem.particlesRendering.primitives.trails.show);
    console.log("  - screen.show:", this.particleSystem.particlesRendering.primitives.screen.show);

    // 添加一个可视化边界框来标记流场区域
    this.addBoundingBox();
  }

  /**
   * 添加可视化边界框
   */
  addBoundingBox () {
    const { lonMin, lonMax, latMin, latMax } = this.bounds;
    const height = this.terrainHeight;

    // 创建四个角的点
    const positions = [
      Cesium.Cartesian3.fromDegrees(lonMin, latMin, height),
      Cesium.Cartesian3.fromDegrees(lonMax, latMin, height),
      Cesium.Cartesian3.fromDegrees(lonMax, latMax, height),
      Cesium.Cartesian3.fromDegrees(lonMin, latMax, height),
      Cesium.Cartesian3.fromDegrees(lonMin, latMin, height) // 闭合
    ];

    // 添加边界框线
    this.boundingBoxEntity = this.viewer.entities.add({
      name: '流场边界',
      polyline: {
        positions: positions,
        width: 3,
        material: new Cesium.PolylineOutlineMaterialProperty({
          color: Cesium.Color.YELLOW,
          outlineWidth: 1,
          outlineColor: Cesium.Color.BLACK
        }),
        clampToGround: false
      }
    });

    // 添加中心点标记
    const centerLon = (lonMin + lonMax) / 2;
    const centerLat = (latMin + latMax) / 2;
    this.centerMarker = this.viewer.entities.add({
      name: '流场中心',
      position: Cesium.Cartesian3.fromDegrees(centerLon, centerLat, height),
      point: {
        pixelSize: 10,
        color: Cesium.Color.RED,
        outlineColor: Cesium.Color.WHITE,
        outlineWidth: 2
      },
      label: {
        text: '流场中心\n高度: ' + height.toFixed(0) + 'm',
        font: '14px sans-serif',
        fillColor: Cesium.Color.WHITE,
        outlineColor: Cesium.Color.BLACK,
        outlineWidth: 2,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        pixelOffset: new Cesium.Cartesian2(0, -10)
      }
    });

    console.log("📦 流场边界框已添加（黄色）");
    console.log("📍 流场中心标记已添加（红色）");
  }

  /**
   * 更新粒子系统参数
   */
  updateOptions (options) {
    Object.assign(this.userInput, options);
    if (this.particleSystem) {
      this.particleSystem.applyUserInput(this.userInput);
    }
  }

  /**
   * 显示/隐藏粒子系统
   */
  setVisible (visible) {
    if (this.particleSystem) {
      const primitives = [
        this.particleSystem.particlesComputing.primitives.calculateSpeed,
        this.particleSystem.particlesComputing.primitives.updatePosition,
        this.particleSystem.particlesComputing.primitives.postProcessingPosition,
        this.particleSystem.particlesRendering.primitives.segments,
        this.particleSystem.particlesRendering.primitives.trails,
        this.particleSystem.particlesRendering.primitives.screen
      ];

      primitives.forEach(primitive => {
        if (primitive) {
          primitive.show = visible;
        }
      });
    }
  }

  /**
   * 销毁粒子系统
   */
  destroy () {
    if (this.particleSystem) {
      // 从场景中移除
      this.viewer.scene.primitives.remove(this.particleSystem.particlesComputing.primitives.calculateSpeed);
      this.viewer.scene.primitives.remove(this.particleSystem.particlesComputing.primitives.updatePosition);
      this.viewer.scene.primitives.remove(this.particleSystem.particlesComputing.primitives.postProcessingPosition);
      this.viewer.scene.primitives.remove(this.particleSystem.particlesRendering.primitives.segments);
      this.viewer.scene.primitives.remove(this.particleSystem.particlesRendering.primitives.trails);
      this.viewer.scene.primitives.remove(this.particleSystem.particlesRendering.primitives.screen);

      console.log("粒子系统已销毁");
    }
  }
}

// 导出到全局
if (typeof window !== 'undefined') {
  window.WindParticleSystem = WindParticleSystem;
}

