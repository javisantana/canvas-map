
  var TILE_SIZE = 256;

  MercatorProjection.prototype.TILE_SIZE = TILE_SIZE;

  function bound(value, opt_min, opt_max) {
    if (opt_min != null) value = Math.max(value, opt_min);
    if (opt_max != null) value = Math.min(value, opt_max);
    return value;
  }

  function degreesToRadians(deg) {
    return deg * (Math.PI / 180);
  }

  function radiansToDegrees(rad) {
    return rad / (Math.PI / 180);
  }

  function MercatorProjection() {
    this.pixelOrigin_ = new v2(TILE_SIZE / 2, TILE_SIZE / 2);
    this.pixelsPerLonDegree_ = TILE_SIZE / 360;
    this.pixelsPerLonRadian_ = TILE_SIZE / (2 * Math.PI);
  }

  MercatorProjection.prototype.fromLatLngToPixel = function(latLng, zoom) {
      var p = this.fromLatLngToPoint(latLng);
      //v2fSAdd(p, this.pixelOrigin_);
      return this.toPixelCoordinate(p, zoom);
  };

  MercatorProjection.prototype.fromLatLngToPoint = function(latLng) {
    var me = this;
    var point = new v2(0, 0);

    point.v[0] = latLng.lng() * me.pixelsPerLonDegree_;

    // NOTE(appleton): Truncating to 0.9999 effectively limits latitude to
    // 89.189.  This is about a third of a tile past the edge of the world
    // tile.
    var siny = bound(Math.sin(degreesToRadians(latLng.lat())), -0.9999,
        0.9999);
    point.v[1] = 0.5 * Math.log((1 + siny) / (1 - siny)) *
        -me.pixelsPerLonRadian_;
    return point;
  };

  MercatorProjection.prototype.fromPointToLatLng = function(point) {
    var me = this;
    //var origin = me.pixelOrigin_;
    var lng = point.v[0] / me.pixelsPerLonDegree_;
    var latRadians = point.v[1] / -me.pixelsPerLonRadian_;
    var lat = radiansToDegrees(2 * Math.atan(Math.exp(latRadians)) -
        Math.PI / 2);
    return new LatLng(lat, lng);
  };

  MercatorProjection.prototype.tileBBox = function(x, y, zoom) {
    var numTiles = 1 << zoom;
    var inc = TILE_SIZE/numTiles;
    var px = x*TILE_SIZE/numTiles;
    var py = y*TILE_SIZE/numTiles;
    return [
        this.fromPointToLatLng(new v2(px, py + inc)),
        this.fromPointToLatLng(new v2(px + inc, py))
    ];
  };

  MercatorProjection.prototype.tilePoint = function(x, y, zoom) {
        var numTiles = 1 << zoom;
        var px = x*TILE_SIZE;
        var py = y*TILE_SIZE;
        return [px, py];
  }

  MercatorProjection.prototype.toPixelCoordinate = function(worldCoordinate, zoom) {
        var numTiles = Math.pow(2, zoom);
        return new v2(
            worldCoordinate.v[0] * numTiles,
            worldCoordinate.v[1] * numTiles);
  }

  MercatorProjection.prototype.latLngToTilePoint = function(latLng, x, y, zoom) {
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
  }

  MercatorProjection.prototype.pixelToTile = function(pixelCoordinate) {
        return v2fFloor(new v2(
                pixelCoordinate.v[0] / TILE_SIZE,
                pixelCoordinate.v[1] / TILE_SIZE));
  };

  MercatorProjection.prototype.pointToTile = function(point, zoom) {
        var numTiles = 1 << zoom;
        var pixelCoordinate = new v2(
                point.v[0] * numTiles,
                point.v[1] * numTiles);
        return this.pixelToTile(pixelCoordinate);
  };

  MercatorProjection.prototype.latLngToTile = function(latLng, zoom) {
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
