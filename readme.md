
# intro

This mapping library for the browser, it allows to create slippy maps.


# quick start

```
var map = new Map(document.getElementById('map'), {
  center: new LatLng(0, 0),
  zoom: 0
});
```

this is just another mapping library for the browser, it allows to create slippy maps. The main
differences with the rest of mapping libraries out there:

 - canvas based, no more CSS3 DOM animations
 - simple and precise API for rendering (scenegraph based)

what it does not provide:

 - multiple kind of layer types
 - full set of rendering features

It just provides a map object and some helpers to render and animate.


# API

## Map object 

### setCenter (laglng)
### setZoom (float)


## Node

### addChild (node)
### removeObject (node)
### remove ()
### getByKey (String)
### render (Context2D)
### update (float)
### requestRender ()
### animate (property: String, value, time: float)

## Animation 

``Animation`` object allows to animate a node property, adding it as a Node child starts the animation.

```
this.addChild(new Animation(this, 'opacity', 1.0, 50));
```

``Node`` shortcut can be used instead:

```
this.animate('opacity', 1.0, 50) // animates opacity to 1.0 in 50ms
```

The element is destroyed from the tree once the animation is finished


### interpolation(fn: Function)
sets the interpolation method, the function should have the following signature:

```
function linear(a, b, t) {}
```

where ``a`` and ``b`` are the initial and end values and ``t`` is a value in range [0, 1]



## TemplatedTiledLayer (templateUrl)

## Event
### on(event: String, callback: Function)
### emit(event: String)
