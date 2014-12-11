// TODO:
// - move clear to layer
// - manage resize
//

(function(root, fm) {
  if (typeof exports !== 'undefined') {
    fm(exports);
  } else {
    // export globaly
    root.FM = {};
    fm(root.FM, root);
  }
})(this, function(FM, root) {
"use strict";


/*
===============================================================================

CORE STUFF

===============================================================================
*/

/*
=================
animation functions
=================
*/
FM.requestAnimFrame = requestAnimationFrame ||
  webkitRequestAnimationFrame ||
  mozRequestAnimationFrame    ||
  oRequestAnimationFrame      ||
  msRequestAnimationFrame     ||
  function(callback){ return setTimeout(callback, 1000 / 60); };

FM.cancelAnimationFrame = cancelAnimationFrame ||
  mozCancelAnimationFrame ||
  webkitCancelAnimationFrame||
  function(c) { clearTimeout(c); };

/*
=================
_.extend
=================
*/
FM.extend = function() {
  var objs = arguments;
  var a = objs[0];
  for (var i = 1; i < objs.length; ++i) {
    var b = objs[i];
    for (var k in b) { a[k] = b[k]; }
  }
  return a;
};


/*
===============================================================================

MATH STUFF

===============================================================================
*/


/*
=================
linear interpolation
=================
*/
function linear(a, b, t) {
  return a * (1.0 - t) + t*b;
}

/*
=================
clamps t value in range [a, b]
=================
*/
function clamp(a, b, t) {
  if (t < a) return a;
  if (t > b) return b;
  return t;
}

/*
=================
smoothstep
=================
*/
function smoothstep(a, b, t) {
  t = (t - a)/(b - a);
  return t*t*(3 - 2*t);
}

/*
=================
deg 2 rad
=================
*/
function degreesToRadians(deg) {
  return deg * (Math.PI / 180);
}

/*
=================
rad to degree
=================
*/
function radiansToDegrees(rad) {
  return rad / (Math.PI / 180);
}

/*
=================
3x3 float mat 
=================
*/
function mat3(v) {
  if (v && v.length !== 9) {
    throw new Error("mat should be 3x3");
  }
  this.v = new Float32Array(v || 9);
}

mat3.prototype = {

  scale: function(s) {
    this.v[0] = s.v[0];
    this.v[4] = s.v[1];
    return this;
  },

  translate: function(t) {
    this.v[6] = t.v[0];
    this.v[7] = t.v[1];
    return this;
  }

};

function mat3Mul(a, b) {
  a = a.v; b = b.v;
  return mat3([])
}

/*
=================
2 component float vector
=================
*/
function v2(x, y) {
  this.v = new Float32Array(2);
  this.v[0] = x;
  this.v[1] = y;
}

v2.prototype = {
  add: function(b) {
    return new v2(this.v[0] + b.v[0], this.v[1] + b.v[1]);
  },
  madd: function(s, b) {
    return new v2(this.v[0] + s*b.v[0], this.v[1] + s*b.v[1]);
  },
  vadd: function(v) {
    return new v2(this.v[0] + v[0], this.v[1] + v[1]);
  },
  vmadd: function(s, v) {
    return new v2(this.v[0] + s*v[0], this.v[1] + s*v[1]);
  }
};
/*
v2.prototype.__defineGetter__('x', function() {
  return this.v[0];
});

v2.prototype.__defineGetter__('y', function() {
  return this.v[1];
});
*/

var v2f = function(x, y) {
  return new v2(x, y);
}

function v2Linear(a, b, t) {
  return v2f(
    linear(a.v[0], b.v[0], t), 
    linear(a.v[1], b.v[1], t)
  )
}

/*
=================
2 component int32 vector
=================
*/
function v2i(x, y) {
  this.v = new Int32Array(2);
  this.v[0] = x >> 0;
  this.v[1] = y >> 0;
}

function v2fAdd(a, b) {
  a = a.v; b = b.v;
  return new v2(a[0] + b[0], a[1] + b[1]);
}

function v2fSAdd(a, b) {
  a = a.v; b = b.v;
  a[0] += b[0];
  a[1] += b[1];
  return a;
}

function v2fFloor(v) {
  v = v.v;
  return new v2i(Math.floor(v[0]), Math.floor(v[1]));
}

function v2fCeil(v) {
  v = v.v;
  return new v2i(Math.ceil(v[0]), Math.ceil(v[1]));
}

function v2fSMulAdd(a, t, b) {
  a = a.v; b = b.v;
  a[0] += t*b[0];
  a[1] += t*b[1];
  return a;
}


var TILE_SIZE = 256;
function MercatorProjection() {
  this.pixelsPerLonDegree_ = TILE_SIZE / 360;
  this.pixelsPerLonRadian_ = TILE_SIZE / (2 * Math.PI);
}

MercatorProjection.prototype = {

  fromLatLngToPixel: function(latLng, zoom) {
    var p = this.fromLatLngToPoint(latLng);
    return this.toPixelCoordinate(p, zoom);
  },

  fromLatLngToPoint: function(latLng) {
    var me = this;
    var point = new v2(0, 0);

    point.v[0] = latLng.lng() * me.pixelsPerLonDegree_;

    // NOTE(appleton): Truncating to 0.9999 effectively limits latitude to
    // 89.189.  This is about a third of a tile past the edge of the world
    // tile.
    var siny = clamp(-0.9999, 0.9999, Math.sin(degreesToRadians(latLng.lat())));
    point.v[1] = 0.5 * Math.log((1 + siny) / (1 - siny)) *
        -me.pixelsPerLonRadian_;
    return point;
  },

  fromPointToLatLng: function(point) {
    var me = this;
    var lng = point.v[0] / me.pixelsPerLonDegree_;
    var latRadians = point.v[1] / -me.pixelsPerLonRadian_;
    var lat = radiansToDegrees(2 * Math.atan(Math.exp(latRadians)) -
        Math.PI / 2);
    return new LatLng(lat, lng);
  },

  tilePoint: function(x, y, zoom) {
    var numTiles = 1 << zoom;
    var px = x*TILE_SIZE;
    var py = y*TILE_SIZE;
    return [px, py];
  },

  toPixelCoordinate: function(worldCoordinate, zoom) {
    var numTiles = Math.pow(2, zoom);
    return new v2(
        worldCoordinate.v[0] * numTiles,
        worldCoordinate.v[1] * numTiles);
  },

  latLngToTilePoint: function(latLng, x, y, zoom) {
    var numTiles = 1 << zoom;
    var projection = this;
    var worldCoordinate = projection.fromLatLngToPoint(latLng);
    var pixelCoordinate = new v2(
            worldCoordinate.v[0] * numTiles,
            worldCoordinate.v[1] * numTiles);
    var tp = this.tilePoint(x, y, zoom);
    return v2fFloor(new v2(
            pixelCoordinate.v[0] - tp[0],
            pixelCoordinate.v[1] - tp[1]));
  },

  pixelToTile: function(pixelCoordinate) {
    return v2fFloor(new v2(
            pixelCoordinate.v[0] / TILE_SIZE,
            pixelCoordinate.v[1] / TILE_SIZE));
  },

  pointToTile: function(point, zoom) {
    var numTiles = 1 << zoom;
    var pixelCoordinate = new v2(
            point.v[0] * numTiles,
            point.v[1] * numTiles);
    return this.pixelToTile(pixelCoordinate);
  },

  latLngToTile: function(latLng, zoom) {
    var numTiles = 1 << zoom;
    var projection = this;
    var worldCoordinate = projection.fromLatLngToPoint(latLng);
    var pixelCoordinate = new v2(
            worldCoordinate.v[0] * numTiles,
            worldCoordinate.v[1] * numTiles);
    return new v2(
            Math.floor(pixelCoordinate.v[0] / TILE_SIZE),
            Math.floor(pixelCoordinate.v[1] / TILE_SIZE));
  }

};


/*
=================
Event mixin
=================
*/
function Event() {}

Event.prototype = {

  on: function(evt, callback) {
    var cb = this.callbacks = this.callbacks || {};
    var l = cb[evt] || (cb[evt] = []);
    l.push(callback);
    return this;
  },
  //TODO: off

  emit: function(evt) {
    var c = this.callbacks && this.callbacks[evt];
    for(var i = 0; c && i < c.length; ++i) {
        c[i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
    return this;
  }

};

FM.Event = Event;


/*
===============================================================================

SCENEGRAPH

===============================================================================
*/

/*
=================
animation helper
=================
*/
function Anim(obj, prop, value, duration, callback) {
  this.key = "anim_" + prop;
  this.obj = obj;
  this.prop = prop;
  this.initialValue = obj[prop];
  this.value = value;
  this.time = 0;
  this.duration = duration;
  this.callback = callback;
  this._interpolation = linear;
  this._easing = function(t) { return clamp(0, 1, t); }
}

Anim.smoothstep = function(t) { return smoothstep(0, 1, t); }


Anim.prototype = {

  interpolation: function(_) {
    this._interpolation = _;
    return this;
  },

  easing: function(_) {
    this._easing = _;
    return this;
  },

  update: function(dt) {
    this.time += dt;
    var t = this._easing(this.time/this.duration);
    this.obj[this.prop] = this._interpolation(this.initialValue, this.value, t);
    if (this.time >= this.duration) {
      return Node.REMOVE;
    }
    return Node.NEED_REFRESH;
  },

  render: function() { },

  onRemove: function() {
    this.callback && this.callback(this);
  }

};

/*
=================
scenegraph Node, all the scenegraph objects should inherit this
=================
*/

function Node() {
  this.objects = [];
  this._objectsKey = {};
  this.parent = null;
}

Node.NEED_REFRESH = 1;
Node.REMOVE = 2;

Node.prototype = {

  addChild: function(obj) {
    this.objects.push(obj);
    obj.parent = this;
    obj.root = this.root ? this.root: this;
    if (obj.key) {
      this._objectsKey[obj.key] = obj;
    }
    obj.onAdd && obj.onAdd(this);
    return obj;
  },

  removeObject: function(obj) {
    if (obj.key) {
      delete this._objectsKey[obj.key];
    }
    var i = this.objects.indexOf(obj);
    if (i >= 0) {
      this.objects.splice(i, 1);
    }
    obj.parent = null;
    obj.root = null;
    obj.onRemove && obj.onRemove(this);
    return obj;
  },

  remove: function() {
    if (this.parent === null) {
      throw new Error("removing node not in a tree");
    }
    this.parent.removeObject(this);
  },

  getByKey: function(k) {
    return this._objectsKey[k];
  },

  render: function(ctx) {
    var o = this.objects;
    for (var i = 0, l = this.objects.length; i < l; ++i) {
      o[i].render(ctx);
    }
    return this;
  },

  update: function(dt) {
    var o = this.objects,
        obj, r,
        remove = [],
        needRefresh = false;
    for (var i = 0, l = this.objects.length; i < l; ++i) {
      obj = o[i];
      r = obj.update(dt);
      if (Node.REMOVE === r) {
        remove.push(obj);
      } else if (Node.NEED_REFRESH === r) {
        needRefresh = true;
      }
    }
    while (remove.length) {
      this.removeObject(remove.pop());
    }
    needRefresh && this.requestRender();
    return this;
  },

  requestRender: function() {
    this.parent && this.parent.requestRender();
  },

  animate: function(prop, value, time, callback) {
    return this.addChild(new Anim(this, prop, value, time, callback));
  }

};



function LatLng(lat, lng) {
  this.latlng = new v2(lng, lat);
}

LatLng.prototype =  {
  clone: function() {
    return new LatLng(this.latlng.v[1], this.latlng.v[0]);
  },

  lng: function() {
    return this.latlng.v[0];
  },

  lat: function() {
    return this.latlng.v[1];
  }

};

FM.LatLng = LatLng;


function Layer(container, map) {
  Node.call(this);

  this.map = map;
  this.width = container.offsetWidth >> 0;
  this.height = container.offsetHeight >> 0;

  container.appendChild(this._createElement(container));
  var ctx = this.canvas.getContext('2d');
  this.ctx = ctx;
}

FM.extend(Layer.prototype, Node.prototype);

Layer.prototype._createElement = function(el) {
  var canvas = this.canvas = document.createElement('canvas');
  canvas.style.padding = '0';
  canvas.style.margin= '0';
  canvas.style.position = 'absolute';
  canvas.width = this.width;
  canvas.height = this.height;

  var div = document.createElement('div');
  div.style.width = this.width + "px";
  div.style.height= this.height + "px";
  div.style.position = 'relative';
  div.appendChild(canvas);
  return div;
};

function map_move_no_filter(map, drag) {
  var projection = map.projection;
  var center_init = map.center.clone();
  drag.on('startdrag', function() {
    center_init = map.center.clone();
  });
  drag.on('move', function(dx, dy) {
    var s = 1/Math.pow(2, map.zoom);
    var pos = projection.fromLatLngToPoint(center_init);
    v2fSMulAdd(pos, -s, new v2(dx, dy));
    var newLatLng = projection.fromPointToLatLng(pos);
    map.setCenter(newLatLng);
 });
 drag.on('dblclick', function(x, y) {
   var v = v2f(x, y).vadd([-map.width/2, -map.height/2]);
   var s = 1/Math.pow(2, map.zoom);
   var pos = projection.fromLatLngToPoint(center_init);
   v2fSMulAdd(pos, s, v);
   var newLatLng = projection.fromPointToLatLng(pos);
   map.setCenter(newLatLng, { animate: true });
   map.setZoom(map.zoom + 1, { animate: true });
 });
}

function map_move_filter(map, drag) {
    var center_init = map.center.clone();
    var target_center = new LatLng();
    this.drag.on('startdrag', function() {
      center_init = map.center.clone();
    });

    function go_to_target() {
      var c = map.center;
      var t = target_center;
      var dlat = t.lat - c.lat;
      var dlon = t.lng - c.lng;
      var delta_lat = 0.1*dlat;
      var delta_lon = 0.1*dlon;
      t.lat += delta_lat;
      t.lng += delta_lon;
      map.setCenter(t);
      if(Math.abs(dlat) + Math.abs(dlon) > 0.0001) {
        FM.requestAnimFrame(go_to_target);
      }
    }

    this.drag.on('move', function(dx, dy) {
      var t = 1 << map.zoom;
      var s = 1/t;
      s = s/map.projection.pixelsPerLonDegree_;
      target_center.lat = center_init.lat + dy*s;
      target_center.lng = center_init.lng - dx*s;
      FM.requestAnimFrame(go_to_target);
    });
}

function Map(el, opts) {
    Node.call(this);
    opts = opts || {};
    var self = this;
    this.currentFrame = null;
    this.rendering = false;
    this.refresh = false;
    this.el = el;
    this.projection = new MercatorProjection();
    this.resize();
    this.lastTime = +Date.now();
    this.transform = new mat3();

    this.on('change:center', this.requestRender.bind(this));
    this.on('change:zoom', this.requestRender.bind(this));

    this.drag = new dragger(this.el);

    this.layers = {
      base: this.addChild(new Layer(this.el, this))
    };
    
    this.setCenter(opts.center || new LatLng(0,0));
    this.setZoom(opts.zoom || 0);

    map_move_no_filter(this, this.drag);
}

Map.ZOOM_ANIMATION_TIME = 250;
Map.PAN_ANIMATION_TIME = 250;

Map.prototype = new Event();
FM.extend(Map.prototype, Node.prototype, {

  requestRender: function() {
    if (!this.rendering) {
      this.rendering = true;
      //FM.cancelAnimationFrame.call(root, this.currentFrame);
      this.currentFrame = FM.requestAnimFrame.call(root, this._render.bind(this));
    } else {
      this.refresh = true;
    }
  },

  _render: function() {
    var lyr, k;
    var scale = Math.pow(2, this.zoom);
    var translate = this.projection.fromLatLngToPoint(this.center);

    var now = Date.now();
    var dt = now - this.lastTime;
    this.lastTime = now;

    // there is no continous rendering so if the delta time is
    // large, make it small
    if (dt > 100) {
      dt = 16.6; // ~60FPS
    }

    this.update(dt);

    this.transform
      .scale(v2f(scale, scale))
      .translate(v2f(this.width/2 - (translate.v[0])*scale, this.height/2 - (translate.v[1])*scale));


    // render
    for (k in this.layers) {
      if (this.layers.hasOwnProperty(k)) {
        lyr = this.layers[k];
        lyr.ctx.setTransform(1, 0, 0, 1, 0, 0);
        lyr.ctx.clearRect(0, 0, lyr.width, lyr.height);

        var v = this.transform.v;
        lyr.ctx.setTransform(
          v[0], v[1], /* v[2] */
          v[3], v[4], /* v[5] */
          v[6], v[7] /* v[8] */
        );

        lyr.render(lyr.ctx);
      }
    }
    this.rendering = false;
    if (this.refresh) {
      this.refresh = false;
      this.requestRender();
    }
  },

  resize: function() {
    this.width = this.el.offsetWidth >> 0;
    this.height = this.el.offsetHeight >> 0;
    this.requestRender();
  },

  setCenter: function(center, options) {
    options = options || { animate: false };
    if (options.animate) {
      var projection = this.projection;
      var centerAnim = new Anim(map, 'center', center, Map.PAN_ANIMATION_TIME)
        .interpolation(function(a, b, t) {
            var pa = projection.fromLatLngToPoint(a);
            var pb = projection.fromLatLngToPoint(b);
            return projection.fromPointToLatLng(v2Linear(pa, pb, t));
        }).easing(Anim.smoothstep);
      this.addChild(centerAnim);
      map.requestRender();
    } else {
      this.center = center.clone();
      this.emit('change:center', this.center);
      this.requestRender();
    }
  },

  getCenterPixel: function() {
    return this.projection.fromLatLngToPixel(this.center, this.zoom);
  },

  setZoom: function(zoom, options) {
    options = options || { animate: false };
    if (options.animate) {
      this.addChild(new Anim(map, 'zoom', map.zoom + 1, Map.ZOOM_ANIMATION_TIME).easing(function(t) {
        return smoothstep(0, 1, t);
      }));
    } else {
      this.zoom = zoom;
      this.emit('change:zoom', this.zoom);
    }
    this.requestRender();
  },

  getProjection: function() {
    return this.projection;
  }

});


function TiledLayer(tile_size, tileClass) {
  Node.call(this);
  this.map = null;
  this.layer = null;
  this.Tile = tileClass;
  this.tile_size = tile_size || 256;
}

FM.extend(TiledLayer.prototype, Node.prototype);

TiledLayer.prototype.update = function(dt) {
  if (this.layer === null || this.map === null) {
    throw new Error("updating layer not added to a map");
  }
  Node.prototype.update.call(this, dt);
  this.updateTiles();
};

// get tiles inside viewport
TiledLayer.prototype.updateTiles = function() {
  var k, i, tile, len, tileShown,
      layer = this.layer,
      map = this.map;
  var center = map.getCenterPixel();

  // tile loading policy
  var intZoom = Math.ceil(map.zoom);
  //var intZoom = Math.floor(map.zoom + 0.5);
  var tileSize = this.tile_size/Math.pow(2, intZoom - map.zoom);
  var t = this.visibleTiles(center, intZoom, tileSize, layer.width, layer.height);
  var tileKeys = {};
  for (i = 0, len = t.length; i < len; ++i) {
    tile = t[i];
    k = this.Tile.tileKey(tile);
    tileShown = this.getByKey(k);
    if (!tileShown) {
      this.addChild(new this.Tile(tile));
    } else {
      tileShown.show();
    }
    tileKeys[k] = true;
  }
  for (k in this._objectsKey) {
    if (tileKeys[k] === undefined) {
      this.getByKey(k).hide();
    }
  }
};

TiledLayer.prototype.onAdd = function(layer) {
  this.map = this.root;
  this.layer = layer;
};

/**
 * return a list of tiles inside the spcified zone
 * the center will be placed on the center of that zone
 */
TiledLayer.prototype.visibleTiles = function(center, zoom, ts, width, height) {
  var pixelToTile = function(pixelCoordinate) {
    return new v2(
      pixelCoordinate.v[0] / ts,
      pixelCoordinate.v[1] / ts
    );
  };
  // move to the center of mercator
  var s = ts*0.5*Math.pow(2, zoom);
  center = center.vadd([s, s]);

  var size = v2f(width, height);
  center = center.madd(-0.5, size);
  var tile = v2fFloor(pixelToTile(center));
  var tile_to = v2fCeil(pixelToTile(center.add(size)));

  var tiles = [];
  var z = zoom;
  for(var i = tile.v[0]; i < tile_to.v[0]; ++i) {
    for(var j = tile.v[1]; j < tile_to.v[1]; ++j) {
      tiles.push({ x: i, y: j, zoom: z, });
    }
  }
  var cx = (tile.v[0] + tile_to.v[0]) * 0.5;
  var cy = (tile.v[1] + tile_to.v[1]) * 0.5;
  tiles.sort(function(a, b) {
    return (Math.abs(a.x - cx) + Math.abs(a.y - cy)) - (Math.abs(b.x - cx) + Math.abs(b.y - cy));
  });
  return tiles;
};

//
// templated tiled layer tile 
//
function Tile(coord) {
  Node.call(this);
  this.coord = coord;
  this.key = Tile.tileKey(coord);
  this.opacity = 0.0;
  this._remove = false;
}

Tile.tileKey = function(t) {
  return t.zoom + "-" + t.x + "-" + t.y;
};

// wraps to coordinates in [0, 1 << tile.zoom]
Tile.wrapCoord = function(tile) {
    var maxTiles = 1 << tile.zoom, 
        x = tile.x < 0 ? maxTiles - ((-tile.x)%maxTiles): tile.x,
        y = tile.y < 0 ? maxTiles - tile.y: tile.y;
    return {
      x: x % maxTiles, y: y % maxTiles, zoom: tile.zoom
    };
};

FM.extend(Tile.prototype, Node.prototype, {

  _subdomain: function(x, y) {
    return 'abcd'[Math.abs(x + y)%4]
  },

  url: function(tile) {
    return this.parent.template
        .replace('{s}', this._subdomain(tile.x, tile.y))
        .replace('{z}', tile.zoom)
        .replace('{x}', tile.x)
        .replace('{y}', tile.y);
  },

  update: function(dt) {
    var self = this;
    var x,y;
    var tile = Tile.wrapCoord(this.coord);
    if (!this.img) {
      this._loaded = false;
      var img = this.img = new Image();
      img.src = this.url(tile);
      img.onload = function() {
        self._loaded = true;
        if (!self.getByKey('anim_opacity')) {
          self.addChild(new Anim(self, 'opacity', 1.0, 750));
          self.requestRender();
        }
      };
      img.onerror = function() {
        //console.log("err", img.src);
      };
    }
    Node.prototype.update.call(this, dt);
    return this._remove ? Node.REMOVE: null;
  },

  render: function(ctx) {
    if (!this._loaded) {
      return;
    }
    var coord = this.coord;
    var s = 1/Math.pow(2, coord.zoom);
    ctx.transform(s, 0,
                  0, s,
                  s*coord.x*256 - 128,
                  s*coord.y*256 - 128);
    var oldAlpha = ctx.globalAlpha;
    ctx.globalAlpha = this.opacity;

    //ctx.strokeRect(0, 0, 256, 256);
    //ctx.fillText(coord.zoom + "/" + coord.x + "/" + coord.y, 0, 0);
    ctx.drawImage(this.img, 0, 0);
    ctx.globalAlpha = oldAlpha;
    var v = this.root.transform.v;
    ctx.setTransform(v[0], v[1],  v[3], v[4], v[6], v[7]);
  },

  show: function() { },

  hide: function() {
    // when tile is not loaded, cancel the request and mark as removeable
    if (!this._loaded) {
      var img = this.img;
      img.src = img.onerror = img.onload = null;
      this._remove = true;
      return;
    }
    var self = this;
    if (!this.getByKey('anim_opacity')) {
      this.animate('opacity', 0, 750, function() {
        self._remove = true;
      });
    }
  }

});

// template tiled layers
// usage:
// map.layers.base.addChild(new TemplateTiledLayer('http://{s}.host.com/{z}/{x}/{y}.png'))
function TemplateTiledLayer(template) {
  this.template = template;
  TiledLayer.call(this, 256, Tile);
}

FM.extend(TemplateTiledLayer.prototype, TiledLayer.prototype, {

  render: function(ctx) {
    TiledLayer.prototype.render.call(this, ctx);
  }

});


function Marker(position) {
  Node.call(this);
  this.setPosition(position);
}

FM.extend(Marker.prototype, Node.prototype, {

  setPosition: function(position) {
    this._position = position;
  },

  update: function() { },

  onAdd: function() {
    this.center = this.root.getProjection().fromLatLngToPoint(this._position);
  },

  render: function(ctx) {
    var p = this.center;
    ctx.fillRect(p.x, p.y, 0.1, 0.1);
  }
});

FM.Map = Map;
FM.TemplateTiledLayer = TemplateTiledLayer;
FM.Marker = Marker;

});
