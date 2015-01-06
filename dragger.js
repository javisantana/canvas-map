
/**
 * send events on drag
 */
function dragger(el) {

    var self = this;
    var dragging = false;
    var x, y;


    el.onmousewheel = function(e) {
      self.emit('wheelDelta', e.wheelDeltaY)
    }

    el.ondblclick = function(e) {
        if (e.touches) {
            var p = e.touches[0];
            x = p.pageX;
            y = p.pageY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }
        self.emit('dblclick', x, y);
    }
    el.ontouchstart = el.onmousedown = function(e) {
        dragging = true;
        if (e.touches) {
            var p = e.touches[0];
            x = p.pageX;
            y = p.pageY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }
        self.emit('startdrag', x, y);
    };

    el.ontouchmove = el.onmousemove = function(e) {
        var xx, yy;
        if(!dragging) return;
        if (e.touches) {
            var p = e.touches[0];
            xx = p.pageX;
            yy = p.pageY;
        } else {
            xx = e.clientX;
            yy = e.clientY;
        }
        var dx = xx - x;
        var dy = yy - y;
        self.emit('move', dx, dy);
        return false;
    };

    el.ontouchend = el.onmouseup = function(e) {
        dragging = false;
    };
}

dragger.prototype = new FM.Event();
