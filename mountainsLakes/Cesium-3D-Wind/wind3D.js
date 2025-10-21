class Wind3D {
    constructor(viewer, panel) {
        this.viewer = viewer;
        this.scene = this.viewer.scene;
        this.camera = this.viewer.camera;

        this.panel = panel;

        this.viewerParameters = {
            lonRange: new Cesium.Cartesian2(),
            latRange: new Cesium.Cartesian2(),
            pixelSize: 0.0
        };
        // use a smaller earth radius to make sure distance to camera > 0
        this.globeBoundingSphere = new Cesium.BoundingSphere(Cesium.Cartesian3.ZERO, 0.99 * 6378137.0);
        this.updateViewerParameters();
        // 加载并解析风场数据（优先 JSON，失败回退到图片）
        DataProcess.loadData()
            .then((payload) => {
                if (payload.type === 'json') {
                    return DataProcess.parseJsonToWindData(payload.json);
                }
                return DataProcess.parseImageDataToWindData(payload.imageData);
            })
            .then((data) => {
                // 确保纹理数据为 Float32Array
                if (!(data.U.array instanceof Float32Array)) {
                    data.U.array = new Float32Array(data.U.array);
                }
                if (!(data.V.array instanceof Float32Array)) {
                    data.V.array = new Float32Array(data.V.array);
                }

                this.particleSystem = new ParticleSystem(
                    this.scene.context,
                    data,
                    this.panel.getUserInput(),
                    this.viewerParameters
                );
                this.addPrimitives();
                this.setupEventListeners();
            })
            .catch((error) => {
                console.error("风场数据加载失败:", error);
            });

        this.imageryLayers = this.viewer.imageryLayers;
        this.setGlobeLayer(this.panel.getUserInput());
    }

    addPrimitives () {
        if (!this.particleSystem) return;


        try {
            // the order of primitives.add() should respect the dependency of primitives
            if (this.particleSystem.particlesComputing && this.particleSystem.particlesComputing.primitives) {
                if (this.particleSystem.particlesComputing.primitives.calculateSpeed) {
                    this.scene.primitives.add(this.particleSystem.particlesComputing.primitives.calculateSpeed);
                }
                if (this.particleSystem.particlesComputing.primitives.updatePosition) {
                    this.scene.primitives.add(this.particleSystem.particlesComputing.primitives.updatePosition);
                }
                if (this.particleSystem.particlesComputing.primitives.postProcessingPosition) {
                    this.scene.primitives.add(this.particleSystem.particlesComputing.primitives.postProcessingPosition);
                }
            }

            if (this.particleSystem.particlesRendering && this.particleSystem.particlesRendering.primitives) {
                if (this.particleSystem.particlesRendering.primitives.segments) {
                    this.scene.primitives.add(this.particleSystem.particlesRendering.primitives.segments);
                }
                if (this.particleSystem.particlesRendering.primitives.trails) {
                    this.scene.primitives.add(this.particleSystem.particlesRendering.primitives.trails);
                }
                if (this.particleSystem.particlesRendering.primitives.screen) {
                    this.scene.primitives.add(this.particleSystem.particlesRendering.primitives.screen);
                }
            }

        } catch (error) {
            console.warn('添加粒子图元时出错:', error);
        }
    }

    removePrimitives () {
        if (!this.particleSystem) return;


        try {
            // 移除计算图元
            if (this.particleSystem.particlesComputing && this.particleSystem.particlesComputing.primitives) {
                if (this.particleSystem.particlesComputing.primitives.calculateSpeed) {
                    this.scene.primitives.remove(this.particleSystem.particlesComputing.primitives.calculateSpeed);
                    this.particleSystem.particlesComputing.primitives.calculateSpeed = null;
                }
                if (this.particleSystem.particlesComputing.primitives.updatePosition) {
                    this.scene.primitives.remove(this.particleSystem.particlesComputing.primitives.updatePosition);
                    this.particleSystem.particlesComputing.primitives.updatePosition = null;
                }
                if (this.particleSystem.particlesComputing.primitives.postProcessingPosition) {
                    this.scene.primitives.remove(this.particleSystem.particlesComputing.primitives.postProcessingPosition);
                    this.particleSystem.particlesComputing.primitives.postProcessingPosition = null;
                }
            }

            // 移除渲染图元
            if (this.particleSystem.particlesRendering && this.particleSystem.particlesRendering.primitives) {
                if (this.particleSystem.particlesRendering.primitives.segments) {
                    this.scene.primitives.remove(this.particleSystem.particlesRendering.primitives.segments);
                    this.particleSystem.particlesRendering.primitives.segments = null;
                }
                if (this.particleSystem.particlesRendering.primitives.trails) {
                    this.scene.primitives.remove(this.particleSystem.particlesRendering.primitives.trails);
                    this.particleSystem.particlesRendering.primitives.trails = null;
                }
                if (this.particleSystem.particlesRendering.primitives.screen) {
                    this.scene.primitives.remove(this.particleSystem.particlesRendering.primitives.screen);
                    this.particleSystem.particlesRendering.primitives.screen = null;
                }
            }

        } catch (error) {
            console.warn('移除粒子图元时出错:', error);
        }
    }

    setWindPrimitivesVisible (visible) {
        if (!this.particleSystem) return;

        try {
            var pc = this.particleSystem.particlesComputing && this.particleSystem.particlesComputing.primitives;
            var pr = this.particleSystem.particlesRendering && this.particleSystem.particlesRendering.primitives;

            if (pc) {
                if (pc.calculateSpeed && !pc.calculateSpeed.isDestroyed()) pc.calculateSpeed.show = visible;
                if (pc.updatePosition && !pc.updatePosition.isDestroyed()) pc.updatePosition.show = visible;
                if (pc.postProcessingPosition && !pc.postProcessingPosition.isDestroyed()) pc.postProcessingPosition.show = visible;
            }
            if (pr) {
                if (pr.segments && !pr.segments.isDestroyed()) pr.segments.show = visible;
                if (pr.trails && !pr.trails.isDestroyed()) pr.trails.show = visible;
                if (pr.screen && !pr.screen.isDestroyed()) pr.screen.show = visible;
            }
        } catch (error) {
            console.warn('设置粒子可见性时出错:', error);
        }
    }

    updateViewerParameters () {
        // 使用全局当前显示范围，如果不存在则使用长江口默认范围
        const currentBounds = window.currentDisplayBounds || {
            lonMin: 120.0,
            lonMax: 123.5,
            latMin: 30.0,
            latMax: 32.5
        };

        this.viewerParameters.lonRange.x = currentBounds.lonMin;
        this.viewerParameters.lonRange.y = currentBounds.lonMax;
        this.viewerParameters.latRange.x = currentBounds.latMin;
        this.viewerParameters.latRange.y = currentBounds.latMax;

        var pixelSize = this.camera.getPixelSize(
            this.globeBoundingSphere,
            this.scene.drawingBufferWidth,
            this.scene.drawingBufferHeight
        );

        if (pixelSize > 0) {
            this.viewerParameters.pixelSize = pixelSize;
        } else {
            this.viewerParameters.pixelSize = 1.0; // 默认值
        }

        console.log("风场范围设置为:",
            this.viewerParameters.lonRange.x, "-", this.viewerParameters.lonRange.y, "°E,",
            this.viewerParameters.latRange.x, "-", this.viewerParameters.latRange.y, "°N");
    }

    setGlobeLayer (userInput) {
        this.viewer.imageryLayers.removeAll();
        this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();

        // 隐藏地球
        this.viewer.scene.globe.show = false;

        var globeLayer = userInput.globeLayer;
        switch (globeLayer.type) {
            case "NaturalEarthII": {
                break;
            }
            case "WMS": {
                break;
            }
            case "WorldTerrain": {
                break;
            }
        }
    }

    setupEventListeners () {
        const that = this;

        this.camera.moveStart.addEventListener(function () {
            // 仅隐藏风场 primitive，高程保持可见
            that.setWindPrimitivesVisible(false);
        });

        this.camera.moveEnd.addEventListener(function () {
            that.updateViewerParameters();
            that.particleSystem.applyViewerParameters(that.viewerParameters);
            that.setWindPrimitivesVisible(true);
        });

        var resized = false;
        window.addEventListener("resize", function () {
            resized = true;
            that.scene.primitives.show = false;
            that.scene.primitives.removeAll();
        });

        this.scene.preRender.addEventListener(function () {
            if (resized) {
                that.particleSystem.canvasResize(that.scene.context);
                resized = false;
                that.addPrimitives();
                that.scene.primitives.show = true;
            }
        });

        window.addEventListener('particleSystemOptionsChanged', function () {
            that.particleSystem.applyUserInput(that.panel.getUserInput());
        });
        window.addEventListener('layerOptionsChanged', function () {
            that.setGlobeLayer(that.panel.getUserInput());
        });
    }

    // 生成长江口区域的风场数据
    createYangtzeWindData () {
        console.log("生成长江口区域风场数据...");

        // 长江口区域范围
        const lonMin = 120.0;
        const lonMax = 123.5;
        const latMin = 30.0;
        const latMax = 32.5;
        const levMin = 0.0;
        const levMax = 10000.0;

        // 网格分辨率
        const lonRes = 0.1; // 0.1度经度
        const latRes = 0.1; // 0.1度纬度
        const levRes = 1000.0; // 1km高度层

        const lonSize = Math.floor((lonMax - lonMin) / lonRes) + 1;
        const latSize = Math.floor((latMax - latMin) / latRes) + 1;
        const levSize = Math.floor((levMax - levMin) / levRes) + 1;

        console.log("风场网格尺寸:", lonSize, "x", latSize, "x", levSize);

        // 生成U和V风场数据
        const totalSize = lonSize * latSize * levSize;
        const U = new Float32Array(totalSize);
        const V = new Float32Array(totalSize);

        for (let i = 0; i < totalSize; i++) {
            const lev = Math.floor(i / (lonSize * latSize));
            const lat = Math.floor((i % (lonSize * latSize)) / lonSize);
            const lon = i % lonSize;

            const actualLon = lonMin + lon * lonRes;
            const actualLat = latMin + lat * latRes;
            const actualLev = levMin + lev * levRes;

            // 生成简单的风场模式：从西向东，从南向北
            const u = 5.0 + 3.0 * Math.sin(actualLon * Math.PI / 180.0) * Math.cos(actualLat * Math.PI / 180.0);
            const v = 2.0 + 1.0 * Math.cos(actualLon * Math.PI / 180.0) * Math.sin(actualLat * Math.PI / 180.0);

            U[i] = u;
            V[i] = v;
        }

        const data = {
            dimensions: {
                lon: lonSize,
                lat: latSize,
                lev: levSize
            },
            lon: {
                min: lonMin,
                max: lonMax
            },
            lat: {
                min: latMin,
                max: latMax
            },
            lev: {
                min: levMin,
                max: levMax
            },
            U: {
                array: U,
                min: Math.min(...U),
                max: Math.max(...U)
            },
            V: {
                array: V,
                min: Math.min(...V),
                max: Math.max(...V)
            }
        };

        console.log("风场数据生成完成:",
            "U范围:", data.U.min.toFixed(2), "-", data.U.max.toFixed(2),
            "V范围:", data.V.min.toFixed(2), "-", data.V.max.toFixed(2));

        return data;
    }

    debug () {
        const that = this;

        var animate = function () {
            that.viewer.resize();
            that.viewer.render();
            requestAnimationFrame(animate);
        }

        var spector = new SPECTOR.Spector();
        spector.displayUI();
        spector.spyCanvases();

        animate();
    }
}
