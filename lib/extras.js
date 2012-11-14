var Polygon = require('./sim/polygon');

exports.get = function(id){
  
  switch(id){

    case 'hexagon':
      // generate a little hexagon
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

  }

}