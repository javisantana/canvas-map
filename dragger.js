
/**
 * send events on drag
 */
function dragger(el) {

    var self = this;
    var dragging = false;
    var x, y;

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
        self.emit('move', xx - x, yy - y);
        return false;
    };

    el.ontouchend = el.onmouseup = function(e) {
        dragging = false;
    };
}

dragger.prototype = new Event();
