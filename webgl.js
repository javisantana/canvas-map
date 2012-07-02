
function glGetError(gl) {
        var ctx, error;
        ctx = gl.getCurrentContext();
        error = ctx.errorValue;
        ctx.errorValue = GL_NO_ERROR;
        return error;
}

// webgl utils
function shaderProgram(gl, vs, fs) {
  var prog = gl.createProgram();
  var addshader = function(type, source) {
    var s = gl.createShader((type == 'vertex') ?
      gl.VERTEX_SHADER : gl.FRAGMENT_SHADER);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw "Could not compile "+type+
        " shader:\n\n"+gl.getShaderInfoLog(s);
    }
    gl.attachShader(prog, s);
  };
  addshader('vertex', vs);
  addshader('fragment', fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw "Could not link the shader program!";
  }
  return prog;
}

function createVertexBuffer(gl, rsize, arr) {
  var buff = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buff);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(arr), gl.STATIC_DRAW);
  buff.vSize = rsize;
  return buff;
}

function setBufferData(gl, prog, attr_name, buff) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buff);
  var attr = gl.getAttribLocation(prog, attr_name);
  gl.enableVertexAttribArray(attr);
  gl.vertexAttribPointer(attr, buff.vSize, gl.FLOAT, false, 0, 0);
}

function initFB() {
    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    fb.width = 512;
    fb.height = 512;
}

function WebGLRenderer(el, map) {
  CanvasRenderer.call(this, el, map, "experimental-webgl");
  this.gl = this.context;
  this._init();
}

WebGLRenderer.prototype = CanvasRenderer.prototype;

WebGLRenderer.prototype._init = function() {
        var gl = this.gl;
        var prog = shaderProgram(gl,
          "precision highp float;\n"+
          "#define pi 3.141592653589793238462643383279 \n" +
          "#define tileSize 256.0 \n" +
          "uniform vec2 mapSize;" +
          "uniform float zoom;" +
          "uniform vec2 mapPos;" +
          "uniform vec2 tilePos;" +
          "attribute vec2 pos;"+
          "varying vec2 vTextureCoord;" +
          "void main() {"+
          " vec2 p = tilePos + vec2(tileSize*0.5) - mapPos;" +
          " p.y = -p.y;" +
          " vec2 rpos = tileSize*pos*0.501;" +
          " vTextureCoord = pos*0.5 + vec2(0.5);"+
          " gl_Position = vec4(2.0*(p + rpos)/mapSize, 0.0, 1.0);"+
          "}",
          "precision highp float;"+
          "varying vec2 vTextureCoord;" +
          "uniform sampler2D tileImage;"+
          "void main() {"+
          "vec4 c = texture2D(tileImage, vec2(vTextureCoord.s, vTextureCoord.t));"+
          "c = pow(c, vec4(6.4));"+
          "c.a = 1.0;"+
          "gl_FragColor = c;"+
          "}"

        );
        this.program = prog;
        gl.useProgram(prog);
        this.vertexBuffer = createVertexBuffer(gl, 2, [
          -1, -1,
          -1, 1,
          1, -1,
          1, 1
        ]);
        setBufferData(gl, prog, "pos", this.vertexBuffer);
        var err = gl.errorValue;
        if(err !== 0) {
          console.log(err);
        }
};
function uploadTexture(gl, img) {
    var texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
}

WebGLRenderer.prototype.loadImageTile = function(tile) {
    var self = this;
    var layer = 'http://b.tiles.mapbox.com/v3/mapbox.mapbox-light/{{z}}/{{x}}/{{y}}.png64';
    //layer = 'http://tile.stamen.com/toner/{{z}}/{{x}}/{{y}}.png';
    var url = layer.replace('{{z}}', tile.zoom).replace('{{x}}', tile.i).replace('{{y}}', tile.j);
    var k = tile.zoom + '-' + tile.x + '-' + tile.y;
    var i = this.image_cache[k];
    if(i === undefined) {
        self.image_cache[k] = null;
        var img = new Image();
        img.crossOrigin = "*";  
        img.onload = function() {
            self.image_cache[k] = uploadTexture(self.gl, img);
            console.log(k + " loaded");
            requestAnimFrame(self.render);
        };
        img.src = url;
    }
}

WebGLRenderer.prototype.renderTiles = function(tiles, center) {
        var gl = this.gl;
        gl.clearColor(0.0, 0.0, 0.0, 0.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);

        var mapSize = gl.getUniformLocation(this.program, "mapSize");
        gl.uniform2fv(mapSize, [this.width, this.height]);
        var zoom = gl.getUniformLocation(this.program, "zoom");
        gl.uniform1f(zoom, this.map.zoom);
        var mapPos = gl.getUniformLocation(this.program, "mapPos");
        gl.uniform2fv(mapPos, [center.x, center.y]);
        var tileImage = gl.getUniformLocation(this.program, "tileImage");

        
        for(var i = 0; i < tiles.length; ++i) {
            var tile = tiles[i];
            this.loadImageTile(tile);
            var k = tile.zoom + '-' + tile.x + '-' + tile.y;
            var img = this.image_cache[k];
            if(img) {
               gl.activeTexture(gl.TEXTURE0);
               gl.bindTexture(gl.TEXTURE_2D, img);
               gl.uniform1i(tileImage, 0);
               var tilePos = gl.getUniformLocation(this.program, "tilePos");
               gl.uniform2fv(tilePos, [tile.x, tile.y]);
               gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            }
        }


        var err = gl.errorValue;
        if(err !== 0) {
          console.log(err);
        }
};
