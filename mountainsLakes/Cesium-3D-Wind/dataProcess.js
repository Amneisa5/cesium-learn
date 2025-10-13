var DataProcess = (function () {
    var data;

    var loadNetCDF = function (filePath) {
        return new Promise(function (resolve, reject) {
            // 兼容旧实现：从图片加载（保留）
            const url = 'images/wind3.png';

            let imageData1 = null;

            function checkComplete () {
                resolve({
                    imageData: imageData1,
                });
            }

            function loadImage (url, callback) {
                var request = new XMLHttpRequest();
                request.open('GET', url, true);
                request.responseType = 'blob';

                request.onload = function () {
                    if (request.status === 200) {
                        let blob = request.response;
                        let reader = new FileReader();
                        reader.onload = function (event) {
                            let img = new Image();
                            img.onload = function () {
                                let canvas = document.createElement('canvas');
                                let width = img.width;
                                let height = img.height;
                                canvas.width = width;
                                canvas.height = height;

                                let ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);

                                let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                callback({
                                    imageData: imageData.data,
                                    width: width,
                                    height: height
                                });
                            };
                            img.src = event.target.result;
                        };
                        reader.readAsDataURL(blob);
                    } else {
                        console.error('Failed to load image:', url, 'Status:', request.status);
                        reject(new Error('Failed to load image: ' + url));
                    }
                };

                request.onerror = function () {
                    console.error('Error loading image:', url);
                    reject(new Error('Error loading image: ' + url));
                };

                request.send();
            }

            // 加载U分量图片
            loadImage(url, function (data) {
                imageData1 = data;
                checkComplete();
            });

        });
    }

    // 从 JSON 读取风场（U/V）数据
    var loadJsonWind = function (url) {
        return new Promise(function (resolve, reject) {
            var request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'json';
            request.onload = function () {
                if (request.status === 200) {
                    resolve(request.response);
                } else {
                    reject(new Error('Failed to load json: ' + url + ' status=' + request.status));
                }
            };
            request.onerror = function () { reject(new Error('Error loading json: ' + url)); };
            request.send();
        });
    }

    // 解析 JSON 为内部风场结构
    var parseJsonToWindData = function (json) {
        var header = json.header || {};
        var lo1 = header.lo1, lo2 = header.lo2, la1 = header.la1, la2 = header.la2;
        var nx = header.nx, ny = header.ny;
        if (!(nx > 0 && ny > 0)) {
            throw new Error('Invalid grid size in json');
        }

        var lonMin = lo1; var lonMax = lo2;
        var latMin = la1; var latMax = la2;
        var levSize = 1;

        var values = json.values || [];
        if (values.length !== nx * ny) {
            // 容错：若点顺序不同，仍按提供的长度截断/填充
            console.warn('values length != nx*ny, got', values.length, 'expected', nx * ny);
        }

        var totalSize = nx * ny * levSize;
        var U = new Float32Array(totalSize);
        var V = new Float32Array(totalSize);

        var uMin = 1e9, uMax = -1e9, vMin = 1e9, vMax = -1e9;
        for (var j = 0; j < ny; j++) {
            for (var i = 0; i < nx; i++) {
                var idx2 = j * nx + i; // 按 header.origin=lower-left 顺序给出，纹理采样统一按索引
                var val = values[idx2] || { u: 0, v: 0 };
                var u = Number(val.u) || 0; var v = Number(val.v) || 0;
                U[idx2] = u; V[idx2] = v;
                if (u < uMin) uMin = u; if (u > uMax) uMax = u;
                if (v < vMin) vMin = v; if (v > vMax) vMax = v;
            }
        }
        return {
            dimensions: { lon: nx, lat: ny, lev: levSize },
            lon: { min: lonMin, max: lonMax },
            lat: { min: latMin, max: latMax },
            lev: { min: 1, max: 1 },
            U: { array: U, min: uMin, max: uMax },
            V: { array: V, min: vMin, max: vMax }
        };
    }

    // 解析图片数据为风场数据
    var parseImageDataToWindData = function ({ imageData }) {
        // 长江口区域范围
        const lonMin = 120.0;
        const lonMax = 123.5;
        const latMin = 30.0;
        const latMax = 32.5;
        const levMin = 0.0;
        const levMax = 10000.0;

        // 网格分辨率
        let uDataRange = {
            max: 13.9323664496927,
            min: 11.2951900556976
        }
        let vDataRange = {
            max: 3.10780312033260,
            min: -2.43086341409122
        }

        const lonSize = imageData.width;
        const latSize = imageData.height;

        const levSize = 1;
        // 生成U和V风场数据
        const totalSize = lonSize * latSize * levSize;
        let data1 = [], data2 = [];
        // 从单张图片提取U(R通道)和V(G通道)分量，图片尺寸为 14x10
        for (let y = imageData.height - 1; y >= 0; y--) {
            for (let x = 0; x < imageData.width; x++) {
                const index = (y * imageData.width + x);
                let data = imageData.imageData;
                data1.push(data[index * 4] / 255 * (uDataRange.max - uDataRange.min) + uDataRange.min);
                let v = data[index * 4 + 2] / 255 * (vDataRange.max - vDataRange.min) + vDataRange.min;
                if (v > 0) {
                    v += 1;
                } else {
                    v -= 1;
                }
                data2.push(v);
            }
        }

        const windData = {
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
                min: 1,
                max: 1
            },
            U: {
                array: new Float32Array(data1),
                min: uDataRange.min,
                max: uDataRange.max
            },
            V: {
                array: new Float32Array(data2),
                min: vDataRange.min,
                max: vDataRange.max
            }
        };
        return windData;
    };

    var loadData = async function () {
        // 优先从 JSON 读取
        try {
            var json = await loadJsonWind('json/changjiangkou.json');
            return { json: json, type: 'json' };
        } catch (e) {
            console.warn('JSON 加载失败，回退到图片: ', e && e.message);
            var imageData = await loadNetCDF();
            return { imageData: imageData, type: 'image' };
        }
    }

    var randomizeParticles = function (maxParticles, viewerParameters) {
        var array = new Float32Array(4 * maxParticles);
        for (var i = 0; i < maxParticles; i++) {
            array[4 * i] = Cesium.Math.randomBetween(viewerParameters.lonRange.x, viewerParameters.lonRange.y);
            array[4 * i + 1] = Cesium.Math.randomBetween(viewerParameters.latRange.x, viewerParameters.latRange.y);
            array[4 * i + 2] = Cesium.Math.randomBetween(data.lev.min, data.lev.max);
            array[4 * i + 3] = 0.0;
        }
        return array;
    }

    return {
        loadData: loadData,
        loadJsonWind: loadJsonWind,
        parseJsonToWindData: parseJsonToWindData,
        parseImageDataToWindData,
        randomizeParticles: randomizeParticles
    };

})();