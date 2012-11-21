var Polygon = require('./sim/polygon')
  , Rect = require('./sim/rect');

exports.get = function(id){

  switch(id){

    case 'hexagon':
      // generate a little hexagon
      // (used for testing)
      var v = []
        , a = (Math.PI*2)/6
        , x = .5
        , y = .5
        , r = .2;
      for( var i=1; i <= 6; i++){
        v.push(
          x + Math.sin(a*(i))*r,
          y + Math.cos(a*(i))*r
        )
      }
      // convert the vertices to a polygon
      return new Polygon(v).reverse();

    case 'extraball':
      var r = new Rect(.1,.2,.2,.1);
      r.icon = id;
      return r;

    case 'speedball':
      var r = new Rect(.8,.9,.9,.8);
      r.icon = id;
      return r;
  }

}