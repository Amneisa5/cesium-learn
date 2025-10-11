# 流场粒子系统使用说明

## 功能概述

在地形高程可视化的基础上，添加了3D流场粒子效果，用于显示动态的流场数据。

## 文件结构

```
mountainsLakes/
├── index.html                 # 主HTML文件
├── index.js                   # 地形可视化主程序
├── wind.js                    # 风场粒子系统封装
└── Cesium-3D-Wind/           # 粒子系统核心库
    ├── customPrimitive.js    # 自定义图元
    ├── particlesComputing.js # 粒子计算
    ├── particlesRendering.js # 粒子渲染
    └── particleSystem.js     # 粒子系统主类
```

## 主要特性

1. **与地形完美配合**：流场范围与地形高程数据范围相同
2. **可见性优化**：流场显示在地形上方，便于观察
3. **动态流场**：模拟旋涡+整体流动的复合流场
4. **实时控制**：支持通过控制台实时调整参数

## 使用方法

### 1. 基本使用

页面加载后，流场系统会自动初始化并显示在地形上方。

### 2. 控制台命令

打开浏览器控制台，可以使用以下命令：

```javascript
// 隐藏流场
windSystem.setVisible(false);

// 显示流场
windSystem.setVisible(true);

// 调整流场速度（默认1.0）
windSystem.updateOptions({ speedFactor: 2.0 });

// 调整粒子数量（需要重新初始化）
windSystem.updateOptions({ maxParticles: 256 * 256 });

// 调整轨迹淡出速度（0.99-0.999，值越大轨迹越长）
windSystem.updateOptions({ fadeOpacity: 0.99 });

// 调整线宽
windSystem.updateOptions({ lineWidth: 3.0 });

// 销毁流场系统
windSystem.destroy();
```

### 3. 参数说明

#### WindParticleSystem 构造函数参数

```javascript
new WindParticleSystem(viewer, bounds, terrainHeight)
```

- `viewer`: Cesium Viewer 实例
- `bounds`: 流场范围 `{ lonMin, lonMax, latMin, latMax }`
- `terrainHeight`: 流场显示高度（米），建议设置为地形最高点之上

#### userInput 可调整参数

- `maxParticles`: 粒子总数（默认 128 * 128 = 16384）
- `particleHeight`: 粒子高度（米）
- `fadeOpacity`: 轨迹淡出速度（0-1，默认 0.996）
- `dropRate`: 粒子重置率（默认 0.003）
- `speedFactor`: 速度倍率（默认 1.0）
- `lineWidth`: 线条宽度（默认 2.0）

## 流场数据

当前实现使用模拟的流场数据，包含：

1. **旋涡分量**：中心区域的逆时针旋转流场
2. **整体流动**：从西向东的主导流动
3. **纬度变化**：随纬度变化的次要流动

### 替换为真实数据

如需使用真实的风场或洋流数据，修改 `wind.js` 中的 `createSimulatedWindData()` 方法：

```javascript
// 从 NetCDF 或其他数据源加载
async loadRealWindData(dataUrl) {
  const response = await fetch(dataUrl);
  const data = await response.arrayBuffer();
  // 解析数据并返回格式化的风场对象
  return {
    dimensions: { lon: ..., lat: ..., lev: ... },
    lon: { array: ..., min: ..., max: ... },
    lat: { array: ..., min: ..., max: ... },
    U: { array: ..., min: ..., max: ... },  // 东西向分量
    V: { array: ..., min: ..., max: ... },  // 南北向分量
    // ...
  };
}
```

## 性能优化

1. **粒子数量**：
   - 低配设备：64 * 64 = 4096 粒子
   - 中配设备：128 * 128 = 16384 粒子（默认）
   - 高配设备：256 * 256 = 65536 粒子

2. **更新频率**：系统自动使用 Cesium 的渲染循环

3. **内存管理**：切换场景或不需要时调用 `windSystem.destroy()`

## 视觉效果调整

### 增强可见性

```javascript
// 增加粒子线宽
windSystem.updateOptions({ lineWidth: 4.0 });

// 延长轨迹
windSystem.updateOptions({ fadeOpacity: 0.999 });

// 加快流动
windSystem.updateOptions({ speedFactor: 2.5 });
```

### 减少视觉干扰

```javascript
// 减少粒子数量
windSystem.updateOptions({ maxParticles: 64 * 64 });

// 缩短轨迹
windSystem.updateOptions({ fadeOpacity: 0.95 });

// 减细线条
windSystem.updateOptions({ lineWidth: 1.0 });
```

## 故障排查

### 流场不显示

1. 检查控制台是否有错误
2. 确认 Cesium-3D-Wind 文件已正确加载
3. 确认地形已加载完成（系统会延迟1秒初始化）

### 性能问题

1. 降低粒子数量
2. 减小 `fadeOpacity` 值以缩短轨迹
3. 降低 `speedFactor` 减缓动画

### 流场位置不对

检查 `bounds` 参数是否与地形范围一致：

```javascript
const windSystem = new WindParticleSystem(
  viewer,
  { lonMin: 120, lonMax: 123.5, latMin: 30, latMax: 32.5 }, // 确保与地形一致
  2000 // 调整高度
);
```

## 扩展功能

### 添加交互控制

可以在页面上添加 GUI 控件：

```html
<div class="wind-controls">
  <label>速度: <input type="range" min="0" max="5" step="0.1" value="1.0" id="speedSlider"></label>
  <button id="toggleWind">显示/隐藏</button>
</div>

<script>
document.getElementById('speedSlider').addEventListener('input', (e) => {
  windSystem.updateOptions({ speedFactor: parseFloat(e.target.value) });
});

document.getElementById('toggleWind').addEventListener('click', () => {
  const isVisible = windSystem.particleSystem.particlesRendering.primitives.screen.show;
  windSystem.setVisible(!isVisible);
});
</script>
```

## 技术细节

- **渲染方式**：GPU 加速的粒子系统
- **更新算法**：基于欧拉法的粒子轨迹计算
- **纹理存储**：使用 FLOAT 纹理存储粒子位置和速度
- **着色器**：自定义 GLSL 着色器实现流场插值和粒子更新

---

如有问题或建议，请查看代码注释或控制台日志输出。


