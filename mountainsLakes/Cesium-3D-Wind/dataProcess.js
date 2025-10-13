var DataProcess = (function () {
    var data;

    var loadNetCDF = function (filePath) {
        return new Promise(function (resolve, reject) {
            // 加载两张图片：U分量和V分量
            const url = 'images/wind3.png'; // U分量

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
                console.log(data)
                imageData1 = data;
                checkComplete();
            });

        });
    }

    // 解析图片数据为风场数据
    var parseImageDataToWindData = function ({ imageData }) {
        console.log("解析图片数据为风场数据...");
        console.log(imageData)
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
                data2.push(data[index * 4 + 1] / 255 * (vDataRange.max - vDataRange.min) + vDataRange.min);
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
                array: data1,
                min: uDataRange.min,
                max: uDataRange.max
            },
            V: {
                array: data2,
                min: vDataRange.min,
                max: vDataRange.max
            }
        };
        console.log(windData)
        return windData;
    };

    var loadData = async function () {
        // 从图片加载风场数据
        var imageData = await loadNetCDF();
        return imageData;
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
        parseImageDataToWindData,
        randomizeParticles: randomizeParticles
    };

})();