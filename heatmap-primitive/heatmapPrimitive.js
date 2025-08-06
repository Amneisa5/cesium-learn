class HeatmapPrimitive {
  constructor(data, params) {
    this.heatmap = null;
    this.params = params;
    this.show = true;
    this.command = null;
    this.primitive = null;

    // 开始处理相关参数
    /**
     * @param {?num} param.currHeight - 距地高度
     */
    if (params.groundHeight == undefined) {
      params.groundHeight = 100.0;
    }
    this.groundHeight = params.groundHeight;
    if (params.currHeight == undefined) {
      params.currHeight = 100.0;
    }
    this.currHeight = params.currHeight;

    this.bounds = params.bounds;
    if (params.opacity == undefined) {
      params.opacity = 1.0;
    }
    /* 
      透明度
    */
    this.opacity = params.opacity;
    /* 网格密度 */
    if (params.density == undefined) {
      params.density = [100, 50];
    }
    this.density = params.density
    /* 数据范围，最大最小值 */
    if (params.range == undefined) {
      params.range = [0, 100];
    }
    this.range = params.range;
    /* 插值过渡半径大小 */
    if (params.radius == undefined) {
      params.radius = 50.0;
    }
    this.blur = params.blur;
    /* 圆弧模糊程度 0-1.0 */
    if (params.blur == undefined) {
      params.blur = 0.85;
    }
    this.range = params.range;
    /* 热力图贴图宽度 */
    let bounds = this.bounds;
    this.width = 500 * (bounds[2] - bounds[0]) / (bounds[3] - bounds[1]);
    /* 热力图贴图高度 */
    this.height = 500;

    /* 处理数据 */
    if (data == undefined) {
      data = [];
      this.randomPointNum = 100;
      /* 随机生成一百个点 */
      for (let i = 0; i < this.randomPointNum; i++) {
        let lon = Math.random() * (bounds[2] - bounds[0]) + bounds[0];
        let lat = Math.random() * (bounds[3] - bounds[1]) + bounds[1];
        let value = Math.random() * 100;
        let x = Math.round(((lon - bounds[0]) / (bounds[2] - bounds[0])) * this.width);
        let y =
          this.height - Math.round(((lat - bounds[1]) / (bounds[3] - bounds[1])) * this.height);
        data.push({ x: x, y: y, value: value });
      }
    } else {
      // 将经纬度转换为在热力图贴图中的坐标
      let currData = [];
      for (let i = 0; i < data.length; i++) {
        let lon = data[i].lon;
        let lat = data[i].lat;
        let value = data[i].value;

        let x = Math.round(((lon - bounds[0]) / (bounds[2] - bounds[0])) * this.width);
        let y =
          this.height - Math.round(((lat - bounds[1]) / (bounds[3] - bounds[1])) * this.height);
        currData.push({ x: x, y: y, value: value });
      }
      this.data = currData;
    }
    /* 热力图颜色数组 */
    if (params.colors == undefined) {
      params.colors = {
        ".0": "#A0A5F0",
        ".1": "blue",
        ".45": "green",
        ".65": "yellow",
        ".8": "orange",
        ".95": "red"
      };
    }
    this.colors = params.colors;
    this.viewer = params.viewer;
    if (params.useDrawCommand == undefined) {
      params.useDrawCommand = false;
    }
    this.attributeLocations = {
      position: 0,
      normal: 1,
      textureCoordinates: 2,
    };
    this.useDrawCommand = params.useDrawCommand;
    this.createHeatmap(this.data);
    if (!this.useDrawCommand) {
      this.genetatePrimitive();
    } else {
      let vtxfVertexShader = `
      // vtxf 使用double类型的position进行计算
      // attribute vec3 position3DHigh;
      // attribute vec3 position3DLow;
      in vec3 position;
      in vec3 normal;
      in vec2 st;
      in float batchId;

      out vec3 v_positionEC;
      out vec3 v_normalEC;
      out vec2 v_st;

      void main()
      {
        // 计算顶点在眼坐标中的位置
        v_positionEC = (czm_modelView * vec4(position, 1.0)).xyz;       
        // 计算顶点在眼坐标中的法线向量
        v_normalEC = czm_normal * normal;                              
        v_st = st;  // 纹理坐标
        // 将顶点从模型空间转换到裁剪空间
        gl_Position = czm_modelViewProjection * vec4(position, 1.0);
      }
    `
      let vtxfFragmentShader = `
        in vec3 v_positionEC;
        in vec3 v_normalEC;
        in vec2 v_st;
        out vec4 fragColor;

        uniform sampler2D myImage;

        void main()
        {
          vec3 positionToEyeEC = -v_positionEC;

          vec3 normalEC = normalize(v_normalEC);
          #ifdef FACE_FORWARD
            normalEC = faceforward(normalEC, vec3(0.0, 0.0, 1.0), -normalEC);
          #endif
            czm_materialInput materialInput;
            materialInput.normalEC = normalEC;
            materialInput.positionToEyeEC = positionToEyeEC;
            materialInput.st = v_st;

            //czm_material material = czm_getMaterial(materialInput);
            czm_material material = czm_getDefaultMaterial(materialInput);
            vec3 color = texture(myImage, materialInput.st).rgb;
            if(color == vec3(0.0, 0.0, 0.0)){
              discard;
            }
            material.diffuse = texture(myImage, materialInput.st).rgb;
          #ifdef FLAT
            fragColor = vec4(material.diffuse + material.emission, material.alpha);
          #else
            fragColor = czm_phong(normalize(positionToEyeEC), material, czm_lightDirectionEC);
          #endif
        }
      `;
      this.vertexShaderSource = new Cesium.ShaderSource({
        sources: [vtxfVertexShader],
      });
      this.fragmentShaderSource = new Cesium.ShaderSource({
        sources: [vtxfFragmentShader],
      });
    }
  }
  genetatePrimitive () {
    let viewer = this.viewer;
    let that = this;
    let geometryInstance = this.createGeometryInstance();
    let appearance = new Cesium.MaterialAppearance({
      material: Cesium.Material.fromType("Image", {
        image: that.heatmap._renderer.canvas,
      })
    })
    // 通过primitives创建
    let opt = {
      geometryInstances: geometryInstance,
      appearance: appearance,
      allowPicking: false,
      asynchronous: false,
    }
    this.primitive = viewer.scene.primitives.add(new Cesium.Primitive(opt));
  }
  removeAll () {
    //移除canvas元素
    const elementToRemove = document.getElementById('curved-canvas');
    if (elementToRemove) {
      elementToRemove.parentNode.removeChild(elementToRemove);
    }
    if (!this.useDrawCommand) {
      this.viewer.scene.primitives.remove(this.primitive);
    } else {
      this.show = false;
      if (Cesium.defined(this.command)) {
        this.command.shaderProgram = this.command.shaderProgram && this.command.shaderProgram.destroy();
      }
    }
  }
  hideMap () {
    this.show = false;
    if (!this.useDrawCommand) {
      this.primitive.show = false;
    }
  }
  createGeometryInstance () {
    let bounds = this.bounds;
    /* 获取热力图宽高 */
    let dWidth = bounds[2] - bounds[0],
      dHeight = bounds[3] - bounds[1],
      left = bounds[0],
      bottom = bounds[1];
    /* 获取网格密度 */
    const dx = dWidth / this.density[0],
      dy = dHeight / this.density[1];
    const h = 0,
      dh = this.currHeight;
    const grids = [];
    /* 生成网格 */
    let rowNum = Math.floor(dWidth / dx),
      colNum = Math.floor(dHeight / dy);
    for (let i = 0; i < colNum; i++) {
      let row = [];
      for (let j = 0; j < rowNum; j++) {
        /* 网格的坐标 */
        let x = left + (j == rowNum ? dWidth : j * dx),
          y = bottom + (i == colNum ? dHeight : i * dy);
        /* 在热力图中的坐标 */
        let screen = {
          x: Math.round(((x - left) / dWidth) * this.width),
          y: this.height - Math.round(((y - bottom) / dHeight) * this.height),
        }
        // 获取热力值
        let value = this.heatmap.getValueAt(screen);
        // 获取颜色值
        let color = this.heatmap._renderer.ctx.getImageData(screen.x, screen.y, 1, 1).data;
        row.push([
          x, y, h + value * dh,
          color.map((c) => c / 255),
          [(x - left) / dWidth, (y - bottom) / dHeight]   // 纹理坐标
        ])
      }
      grids.push(row);
    }
    const wgs84Positions = [];
    const indices = [];
    const colors = [];
    const sts = [];
    let idxCursor = 0;  // 三角点索引
    let groundHeight = this.groundHeight; // 距地高度
    for (let i = 0; i < grids.length - 1; i++) {
      for (let j = 0; j < grids[i].length - 1; j++) {
        if (i != 0) {
          let p1 = grids[i][j];
          let p2 = grids[i][j + 1];
          let p3 = grids[i + 1][j + 1];
          let p4 = grids[i + 1][j];

          // 将点位存储到数组中
          this.saveVertices(p1, wgs84Positions, colors, sts, groundHeight)
          this.saveVertices(p2, wgs84Positions, colors, sts, groundHeight)
          this.saveVertices(p3, wgs84Positions, colors, sts, groundHeight)
          this.saveVertices(p4, wgs84Positions, colors, sts, groundHeight)

          // 存储三角点 
          indices.push(idxCursor, idxCursor + 1, idxCursor + 2, idxCursor, idxCursor + 2, idxCursor + 3);
          idxCursor += 4;
        }
      }
    }
    const geometry = this.generateGeometry(wgs84Positions, colors, indices, sts);
    return new Cesium.GeometryInstance({
      geometry: Cesium.GeometryPipeline.computeNormal(geometry)
    })
  }
  generateGeometry (positions, colors, indices, sts) {
    // 计算包围球
    const boundingSphere = Cesium.BoundingSphere.fromVertices(
      positions,
      new Cesium.Cartesian3(0.0, 0.0, 0.0),
      3
    );
    const geometry = new Cesium.Geometry({
      attributes: new Cesium.GeometryAttributes({
        position: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.DOUBLE,
          componentsPerAttribute: 3,
          values: new Float64Array(positions)
        }),
        color: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 4,
          values: new Float32Array(colors)
        }),
        st: new Cesium.GeometryAttribute({
          componentDatatype: Cesium.ComponentDatatype.FLOAT,
          componentsPerAttribute: 2,
          values: new Float32Array(sts)
        })
      }),
      indices: indices,
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      boundingSphere: boundingSphere
    })
    return geometry
  }
  saveVertices (position, wgs84Positions, colors, sts, groundHeight) {
    // 将经纬度转换为世界坐标
    let c3Position = Cesium.Cartesian3.fromDegrees(position[0], position[1], position[2] + groundHeight);
    // 存储位置
    wgs84Positions.push(c3Position.x, c3Position.y, c3Position.z);
    // 存储颜色
    colors.push(position[3][0], position[3][1], position[3][2], position[3][3]);
    // 存储纹理坐标
    sts.push(position[4][0], position[4][1]);
  }
  createHeatmap (data) {
    let _this = this;
    var domElement = document.createElement("div");
    domElement.setAttribute(
      "style",
      "width: " + this.width + "px; height: " + this.height + "px; margin: 0px; display: none;"
    );
    domElement.setAttribute(
      "id",
      "curved-canvas"
    );
    document.body.appendChild(domElement);
    this.heatmap = h337.create({
      container: domElement,
      radius: _this.radius,
      maxOpacity: _this.opacity,
      //minOpacity: 0.1,
      minOpacity: _this.opacity,
      blur: _this.blur,
      backgroundColor: "yellow",
      gradient: _this.colors,
    });
    this.heatmap.setData({
      min: this.range[0],
      max: this.range[1],
      data: data,
    });
  }
  createCommand (context) {
    // 通过drawCommand创建
    var translucent = false;
    var closed = true;
    // 借用一下Appearance.getDefaultRenderState
    var rawRenderState = Cesium.Appearance.getDefaultRenderState(translucent, closed, undefined);
    var renderState = Cesium.RenderState.fromCache(rawRenderState);
    let texture = new Cesium.Texture({
      context: context,
      width: this.width,
      height: this.height,
      source: this.heatmap._renderer.canvas,
      sampler: new Cesium.Sampler({
        minificationFilter: Cesium.TextureMinificationFilter.LINEAR,
        magnificationFilter: Cesium.TextureMagnificationFilter.LINEAR,
      })
    })
    var uniformMap = {
      myImage: function () {
        if (Cesium.defined(texture)) {
          return texture;
        } else {
          return context.defaultTexture;
        }
      },
    };
    var shaderProgram = Cesium.ShaderProgram.fromCache({
      context: context,
      vertexShaderSource: this.vertexShaderSource,
      fragmentShaderSource: this.fragmentShaderSource,
      attributeLocations: this.attributeLocations,
    })
    return new Cesium.DrawCommand({
      vertexArray: this.createVertexArray(context),
      primitiveType: Cesium.PrimitiveType.TRIANGLES,
      renderState: renderState,
      shaderProgram: shaderProgram,
      uniformMap: uniformMap,
      owner: this,
      // framebuffer : framebuffer,
      pass: Cesium.Pass.OPAQUE,
    })
  }
  createVertexArray (context) {
    let geometryInstance = this.createGeometryInstance();
    var vertexArray = Cesium.VertexArray.fromGeometry({
      context,
      geometry: geometryInstance.geometry,
      attributeLocations: this.attributeLocations,
      bufferUsage: Cesium.BufferUsage.STATIC_DRAW
    })
    return vertexArray;
  }
  update (frameState) {
    if (!this.show) {
      return;
    }
    if (!this.useDrawCommand) {
      return;
    }
    if (!Cesium.defined(this.command)) {
      this.command = this.createCommand(frameState.context);
    }
    if (Cesium.defined(this.command)) {
      frameState.commandList.push(this.command);
    }
  }
  isDestroyed () {

  }
  destory () {
    if (Cesium.defined(this.command)) {
      this.command.shaderProgram = this.command.shaderProgram && this.command.shaderProgram.destroy();
    }
  }
}