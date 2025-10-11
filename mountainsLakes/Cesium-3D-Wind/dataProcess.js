// 如果 fileOptions 已经存在（由 wind.js 定义），则使用它；否则使用默认值
if (typeof fileOptions === 'undefined') {
    var fileOptions = {
        dataDirectory: 'Cesium-3D-Wind/',
        dataFile: "demo.nc",
        glslDirectory: 'Cesium-3D-Wind/glsl/'
    };
}

var DataProcess = (function () {
    var data;
    var loadColorTable = function (
        colorTable = [[0.015686,
            0.054902,
            0.847059],
        [0.125490,
            0.313725,
            1.000000],
        [0.254902,
            0.588235,
            1.000000],
        [0.427451,
            0.756863,
            1.000000],
        [0.525490,
            0.850980,
            1.000000],
        [0.611765,
            0.933333,
            1.000000],
        [0.686275,
            0.960784,
            1.000000],
        [0.807843,
            1.000000,
            1.000000],
        [1.000000,
            0.996078,
            0.278431],
        [1.000000,
            0.921569,
            0.000000],
        [1.000000,
            0.768627,
            0.000000],
        [1.000000,
            0.564706,
            0.000000],
        [1.000000,
            0.282353,
            0.000000],
        [1.000000,
            0.000000,
            0.000000],
        [0.835294,
            0.000000,
            0.000000],
        [0.619608,
            0.000000,
            0.000000]]) {
        let colorNum = colorTable.length;
        let arr = [];
        colorTable.map(color => {
            arr = arr.concat(color);
        })
        data.colorTable = {
            colorNum,
            array: new Float32Array(arr.flat())
        };
    }

    var loadNetCDF = function (filePath) {
        return new Promise(function (resolve) {
            var request = new XMLHttpRequest();
            request.open('GET', filePath);
            request.responseType = 'arraybuffer';

            request.onload = function () {
                var arrayToMap = function (array) {
                    return array.reduce(function (map, object) {
                        map[object.name] = object;
                        return map;
                    }, {});
                }
                // 读取nc数据
                var NetCDF = new netcdfjs(request.response);
                console.log(NetCDF)
                data = {};
                var dimensions = arrayToMap(NetCDF.dimensions);
                data.dimensions = {};
                data.dimensions.lon = dimensions['lon'].size;
                data.dimensions.lat = dimensions['lat'].size;
                data.dimensions.lev = dimensions['lev'].size;

                var variables = arrayToMap(NetCDF.variables);
                var uAttributes = arrayToMap(variables['U'].attributes);
                var vAttributes = arrayToMap(variables['V'].attributes);

                data.lon = {};
                data.lon.array = new Float32Array(NetCDF.getDataVariable('lon').flat());
                data.lon.min = Math.min(...data.lon.array);
                data.lon.max = Math.max(...data.lon.array);

                data.lat = {};
                data.lat.array = new Float32Array(NetCDF.getDataVariable('lat').flat());
                data.lat.min = Math.min(...data.lat.array);
                data.lat.max = Math.max(...data.lat.array);

                data.lev = {};
                data.lev.array = new Float32Array(NetCDF.getDataVariable('lev').flat());
                data.lev.min = Math.min(...data.lev.array);
                data.lev.max = Math.max(...data.lev.array);

                data.U = {};
                data.U.array = new Float32Array(NetCDF.getDataVariable('U').flat());
                data.U.min = uAttributes['min'].value;
                data.U.max = uAttributes['max'].value;

                data.V = {};
                data.V.array = new Float32Array(NetCDF.getDataVariable('V').flat());
                data.V.min = vAttributes['min'].value;
                data.V.max = vAttributes['max'].value;
                loadColorTable()
                console.log(data)
                resolve(data);
            };

            request.send();
        });
    }

    var loadData = async function () {
        var ncFilePath = fileOptions.dataDirectory + fileOptions.dataFile;
        await loadNetCDF(ncFilePath);
        return data;
    }

    var randomizeParticles = function (maxParticles, viewerParameters) {
        var array = new Float32Array(4 * maxParticles);
        for (var i = 0; i < maxParticles; i++) {
            // 经度随机值
            array[4 * i] = Cesium.Math.randomBetween(viewerParameters.lonRange.x, viewerParameters.lonRange.y);
            // 纬度随机值
            array[4 * i + 1] = Cesium.Math.randomBetween(viewerParameters.latRange.x, viewerParameters.latRange.y);
            array[4 * i + 2] = Cesium.Math.randomBetween(data.lev.min, data.lev.max);
            array[4 * i + 3] = 0.0;
        }
        return array;
    }

    return {
        loadData: loadData,
        randomizeParticles: randomizeParticles
    };

})();