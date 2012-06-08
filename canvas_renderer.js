/**
 * canvas renderer
 */

function CanvasRenderer(el, map) {
    var self = this;
    this._createElement(el);

    function render() {
        var tiles = map.visibleTiles(self.width, self.height);
        self.renderTiles(tiles, this.center_pixel);
    }

    map.on('center_changed', render);
    map.on('zoom_changed', render);

    this.center_init = null;
    this.target_center = new LatLng();
    this.drag = new dragger(this.container);
    this.drag.on('startdrag', function() {
        self.center_init = map.center.clone();
    });

    function go_to_target() {
        var c = map.center;
        var t = self.target_center;
        var dlat = t.lat - c.lat;
        var dlon = t.lng - c.lng;
        t.lat += dlat*0.001;
        t.lng += dlon*0.001;
        map.setCenter(t);
        if(Math.abs(dlat) + Math.abs(dlon) > 0.00001) {
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

    map.setCenter(map.center);

}

CanvasRenderer.prototype._createElement = function(el) {
    this.el = el;
    this.width = el.offsetWidth >> 0;
    this.height = el.offsetHeight >> 0;
    var widthHalf = (this.width / 2) >> 0;
    var heightHalf = (this.height / 2) >> 0;

    var canvas = this.canvas = document.createElement('canvas');
    canvas.style.padding = '0';
    canvas.style.margin= '0';
    canvas.style.position = 'absolute';
    canvas.width = this.width;
    canvas.height = this.height;

    var context = canvas.getContext( '2d' );
    context.translate( widthHalf, heightHalf );
    this.context = context;

    var div = document.createElement('div');
    div.style.width = this.width + "px";
    div.style.height= this.height + "px";
    div.style.position = 'relative';
    div.appendChild(canvas);
    el.appendChild(div);
    this.container = div;
};

CanvasRenderer.prototype.renderTile = function(tile, at) {
    var self = this;
    //var layer = 'http://a.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{{z}}/{{x}}/{{y}}.png';
    var layer = 'http://b.tiles.mapbox.com/v3/mapbox.mapbox-light/{{z}}/{{x}}/{{y}}.png64';
    //var layer = 'http://a.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{{z}}/{{x}}/{{y}}.png';
    //var layer = 'http://gsp2.apple.com/tile?api=1&style=slideshow&layers=default&lang=en_EN&z={{z}}&x={{x}}&y={{y}}&v=9';
    var url = layer.replace('{{z}}', tile.zoom).replace('{{x}}', tile.i).replace('{{y}}', tile.j);
    var img = new Image();
    img.src = url;
    img.onload = function() {
        self.context.drawImage(img, at.x, at.y);
    };
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
