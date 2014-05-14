/**
 * canvas renderer
 */

function CanvasRenderer(el, map, ctx_type) {
    var self = this;
    this.map = map;
    this._createElement(el);

    ctx_type = ctx_type || '2d';
    var context = this.canvas.getContext(ctx_type);
    var widthHalf = (this.width / 2) >> 0;
    var heightHalf = (this.height / 2) >> 0;
    if(context.translate) {
        context.translate( widthHalf, heightHalf );
    }
    this.context = context;
    this.image_cache = {};

    function render() {
        var tiles = map.visibleTiles(self.width, self.height);
    //    self.context.clearRect(-widthHalf, -heightHalf, self.width, self.height);
        self.renderTiles(tiles, map.center_pixel);
    }
    this.render = render;

    map.on('center_changed', render);
    map.on('zoom_changed', render);

    this.center_init = null;
    this.target_center = new LatLng();
    this.drag = new dragger(this.container);

    self.center_init = map.center.clone();
    this.drag.on('startdrag', function() {
        self.center_init = map.center.clone();
    });

    function go_to_target() {
        var c = map.center;
        var t = self.target_center;
        var dlat = t.lat - c.lat;
        var dlon = t.lng - c.lng;
        var delta_lat = 0.1*dlat;
        var delta_lon = 0.1*dlon;
        var w = self.canvas.width;
        var h = self.canvas.height;
        t.lat += delta_lat;
        t.lon += delta_lon;
        map.setCenter(t);
        if(Math.abs(dlat) + Math.abs(dlon) > 0.0001) {
          requestAnimFrame(go_to_target);
        }
    }

    this.drag.on('move', function(dx, dy) {
        var t = 1 << map.zoom;
        var s = 1/t;
        s = s/map.projection.pixelsPerLonDegree_;
        self.target_center.lat = self.center_init.lat + dy*s;
        self.target_center.lng = self.center_init.lng - dx*s;
        requestAnimFrame(go_to_target);
    });
    //requestAnimFrame(go_to_target);


}

CanvasRenderer.prototype._createElement = function(el) {
    this.el = el;
    this.width = el.offsetWidth >> 0;
    this.height = el.offsetHeight >> 0;

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
    el.appendChild(div);
    this.container = div;
};

var style = '#tm_world_borders_simpl_0_18{polygon-fill:#888;line-color:#444;line-opacity: 0.3;}';
var template = 'http://dev.localhost.lan:8181/tiles/tm_world_borders_simpl_0_18/{z}/{x}/{y}.png?style='+encodeURIComponent(style);

CanvasRenderer.prototype.renderTile = function(tile, at) {
  var self = this;
    var layer = template;
    var url = layer.replace('{z}', tile.zoom).replace('{x}', tile.i).replace('{y}', tile.j);
    var i = this.image_cache[url];
    if(i === undefined) {
        self.image_cache[url] = null;
        var img = new Image();
        img.src = url;
        img.onload = function() {
            self.image_cache[url] = img;
            requestAnimFrame(self.render);
        };
    } else {
        if(i) {
            self.context.drawImage(i, at.x, at.y);
        } // else waiting
    }
}

CanvasRenderer.prototype.renderTiles = function(tiles, center) {
    for(var i = 0; i < tiles.length; ++i) {
        var tile = tiles[i];
        var p = new Point(tile.x, tile.y);
        p.x -= center.x;
        p.y -= center.y;
        this.renderTile(tile, p);
    }
}
