var Polygon = require('./sim/polygon');

exports.get = function(id){
  
  switch(id){

    case 'hexagon':
      // convert the vertices to a polygon
      return new Polygon(vertices).reverse();

  }

}