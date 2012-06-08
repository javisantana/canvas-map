
window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       || 
              window.webkitRequestAnimationFrame || 
              window.mozRequestAnimationFrame    || 
              window.oRequestAnimationFrame      || 
              window.msRequestAnimationFrame     || 
              function( callback ){
                window.setTimeout(callback, 1000 / 60);
              };
    })();

function Event() {}
Event.prototype.on = function(evt, callback) { 
    var cb = this.callbacks = this.callbacks || {};
    var l = cb[evt] || (cb[evt] = []);
    l.push(callback);
};

Event.prototype.emit = function(evt) {
    var c = this.callbacks && this.callbacks[evt];
    for(var i = 0; c && i < c.length; ++i) {
        c[i].apply(this, Array.prototype.slice.call(arguments, 1));
    }
};



function MapModel(opts) {
    opts = opts || {};
    this.projection = new MercatorProjection();
    this.setCenter(opts.center || new LatLng(0,0));
    this.setZoom(opts.zoom || 1);
}

MapModel.prototype = new Event();

MapModel.prototype.setCenter = function(center) {
    this.center = new LatLng(center.lat, center.lng);
    this.center_pixel = this.projection.fromLatLngToPixel(this.center, this.zoom).floor();
    this.emit('center_changed', this.center);
};

MapModel.prototype.setZoom = function(zoom) {
    this.zoom = zoom;
    this.center_pixel = this.projection.fromLatLngToPixel(this.center, this.zoom).floor();
    this.emit('zoom_changed', this.center);
};

/**
 * return a list of tiles inside the spcified zone
 * the center will be placed on the center of that zone
 */
MapModel.prototype.visibleTiles = function(width, height) {
    var self = this;
    var widthHalf = width / 2;
    var heightHalf = height / 2;
    var center_point = self.projection.fromLatLngToPixel(self.center, self.zoom);
    center_point.x -= widthHalf;
    center_point.y -= heightHalf;
    var tile = this.projection.pixelToTile(center_point, self.zoom);
    var offset_x = center_point.x%this.projection.TILE_SIZE;
    var offset_y = center_point.y%this.projection.TILE_SIZE;

    var num_tiles_x = Math.ceil((width + offset_x)/this.projection.TILE_SIZE);
    var num_tiles_y = Math.ceil((height + offset_y)/this.projection.TILE_SIZE);

    var tiles = [];
    for(var i = 0; i < num_tiles_x; ++i) {
        for(var j = 0; j < num_tiles_y; ++j) {
            var tile_x = tile.x + i;
            var tile_y = tile.y + j;
            tiles.push({
                x: tile_x * this.projection.TILE_SIZE,
                y: tile_y * this.projection.TILE_SIZE,
                zoom: self.zoom,
                i: tile_x,
                j: tile_y
            });
        }
    }
    return tiles;

};



function Map(opts, rendeder) {
    opts = opts || {};
    var self = this;
    this.model = new MapModel({
        center: opts.center || new LatLng(41.69, -4.83),
        zoom: opts.zoom || 1
    });
}

