"use strict";

var FM = typeof module !== 'undefined' ? module.exports : {};
FM.requestAnimFrame = window.requestAnimationFrame ||
              window.webkitRequestAnimationFrame ||
              window.mozRequestAnimationFrame    ||
              window.oRequestAnimationFrame      ||
              window.msRequestAnimationFrame     ||
              function(callback){ return window.setTimeout(callback, 1000 / 60); };
FM.cancelAnimationFrame = window.requestCancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame||  function(c) { window.cancelTimeout(c); };

FM.extend = function(a, b) {
  for (var k in b) {
    a[k] = b[k];
  }
  return a;
};


function Event() {}

Event.prototype = {

  on: function(evt, callback) {
    var cb = this.callbacks = this.callbacks || {};
    var l = cb[evt] || (cb[evt] = []);
    l.push(callback);
  },

  emit: function(evt) {
    var c = this.callbacks && this.callbacks[evt];
    for(var i = 0; c && i < c.length; ++i) {
        c[i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
  }

};

function Node() {
  this.objects = [];
  this._objectsKey = {};
  this.parent = null;
}

Node.prototype = {

  addObject: function(obj) {
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
      delete this._objectsKey[o.key];
    }
    var i = this.objects.indexOf(o);
    if (i >= 0) {
      this.objects.splice(i, 1);
    }
    obj.parent = null;
    obj.root = null;
    obj.onRemove && obj.onRemove(this);
    return obj;
  },

  render: function(ctx) {
    var o = this.objects;
    for (var i = 0, l = this.objects.length; i < l; ++i) {
      o[i].render(ctx);
    }
    return this;
  }

};


function v2f(x, y) {
  Float32Array.call(this, 2);
  this[0] = x;
  this[1] = x;
}

FM.extend(v2f.prototype, Float32Array.prototype);

function v2fAdd(a, b) {
  return new v2f(a[0] + b[0], a[1] + b[1]);
}

function v2fSAdd(a, b) {
  a[0] += b[0];
  a[1] += b[1];
  return a;
}

function v2fSMulAdd(a, t, b) {
  a[0] += t*b[0];
  a[1] += t*b[1];
  return a;
}

function LatLng(lat, lng) {
  this.lat = lat;
  this.lng = lng;
}

LatLng.prototype.clone = function() {
  return new LatLng(this.lat, this.lng);
};


function Layer(container, map) {
  Node.call(this);

  this.map = map;
  this.width = container.offsetWidth >> 0;
  this.height = container.offsetHeight >> 0;

  container.appendChild(this._createElement(container));
  var ctx = this.canvas.getContext('2d');
  var widthHalf = this.width >> 1;
  var heightHalf = this.height >> 1;
  ctx.translate(widthHalf, heightHalf);
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
    pos.x -= dx*s;
    pos.y -= dy*s;
    var newLatLng = projection.fromPointToLatLng(pos);
    map.setCenter({ lat: newLatLng.lat, lng: newLatLng.lng });
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
    this.el = el;
    this.projection = new MercatorProjection();
    this.resize();

    this.on('center_changed', this._render.bind(this));
    this.on('zoom_changed', this._render.bind(this));

    this.drag = new dragger(this.el);

    this.layers = {
      base: this.addObject(new Layer(this.el, this))
    };

    this.setCenter(opts.center || new LatLng(0,0));
    this.setZoom(opts.zoom || 0);

    map_move_no_filter(this, this.drag);
}

Map.prototype = new Event();
FM.extend(Map.prototype, Node.prototype);
FM.extend(Map.prototype, {

  render: function() {
    if (!this.rendering) {
      this.rendering = true;
      FM.cancelAnimationFrame.call(window, this.currentFrame);
      this.currentFrame = FM.requestAnimFrame.call(window, this._render.bind(this));
    }

  },

  _render: function() {
    var scale = Math.pow(2, this.zoom);
    var translate = this.projection.fromLatLngToPoint(this.center);
    for (var k in this.layers) {
      if (this.layers.hasOwnProperty(k)) {
        var lyr = this.layers[k];
        lyr.ctx.resetTransform();
        lyr.ctx.clearRect(0, 0, lyr.width, lyr.height);

        lyr.ctx.setTransform(
          scale, 0,
          0, scale,
         lyr.width/2 - (translate.x - 128)*scale, lyr.height/2 - (translate.y - 128)*scale
        );

        lyr.render(lyr.ctx);
      }
    }
    this.rendering = false;
  },

  resize: function() {
    this.width = this.el.offsetWidth >> 0;
    this.height = this.el.offsetHeight >> 0;
  },

  setCenter: function(center) {
    this.center = new LatLng(center.lat, center.lng);
    this.emit('center_changed', this.center);
    this.render();
  },

  getCenterPixel: function() {
    return this.projection.fromLatLngToPixel(this.center, this.zoom);
  },

  setZoom: function(zoom) {
    this.zoom = zoom;
    this.emit('zoom_changed', this.zoom);
    this.render();
  }

});


function TiledLayer() {
  this.tiles = {};
}

TiledLayer.prototype.tileKey = function(t) {
  return t.zoom + "-" + t.x + "-" + t.y;
};

TiledLayer.prototype.render = function() {
  this.updateTiles();
};

TiledLayer.prototype.onAdd = function(layer) {
  var self = this;
  var map = this.root;
  this.updateTiles = function() {
    var k, i, tile;
    var center = map.getCenterPixel();
    center.x -= layer.width/2.0;
    center.y -= layer.height/2.0;
    var intZoom = Math.ceil(map.zoom);
    var tileSize = 256 / Math.pow(2, intZoom - map.zoom);
    var t = self.visibleTiles(center, intZoom, tileSize, layer.width, layer.height);
    var tileKeys = {};
    for (i = 0; i < t.length; ++i) {
      tile = t[i];
      k = self.tileKey(tile);
      tileKeys[k] = true;
      if (!self.tiles[k]) {
        self.tiles[k] = tile;
      }
    }
    for (k in self.tiles) {
      if (!tileKeys[k]) {
        delete self.tiles[k];
      }
    }
  };
};
/**
 * return a list of tiles inside the spcified zone
 * the center will be placed on the center of that zone
 */
TiledLayer.prototype.visibleTiles = function(center, zoom, ts, width, height) {
    var pixelToTile = function(pixelCoordinate) {
      return new Point(
        Math.floor(pixelCoordinate.x / ts),
        Math.floor(pixelCoordinate.y / ts));
    };
    var tile = pixelToTile(center);
    var tile_to = pixelToTile({ x: center.x + width, y: center.y + height });

    var tiles = [];
    var z = zoom;
    for(var i = tile.x; i < tile_to.x + 1; ++i) {
        for(var j = tile.y; j < tile_to.y + 1; ++j) {
            tiles.push({ x: i, y: j, zoom: z, });
        }
    }
    return tiles;

};

