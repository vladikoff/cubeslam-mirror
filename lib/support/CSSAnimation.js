  module.exports = {
    getEventTypes:getEventTypes
  };

  function camelCaseEventTypes(prefix) {
    prefix = prefix || '';
 
    return {
      start: prefix + 'AnimationStart',
      end: prefix + 'AnimationEnd',
      iteration: prefix + 'AnimationIteration'
    };
  }
 
  function lowerCaseEventTypes(prefix) {
    prefix = prefix || '';
 
    return {
      start: prefix + 'animationstart',
      end: prefix + 'animationend',
      iteration: prefix + 'animationiteration'
    };
  }
 
  /**
   * @return {Object} Animation Event types {start, end, iteration}
   */
 
  function getEventTypes() {
    var prefixes = ['webkit', 'Moz', 'O', ''];
    var style = document.documentElement.style;
 
    if(style.animationName !== undefined) {
      return lowerCaseEventTypes();
    }
 
    for(var i = 0, len = prefixes.length, prefix; i < len; i++) {
      prefix = prefixes[i];
 
      if(style[prefix + 'AnimationName'] !== undefined) {
        if(i === 0) {
          return camelCaseEventTypes(prefix.toLowerCase());
        } else if(i === 1) {
          return lowerCaseEventTypes();
        } else if(i === 2) {
          return lowerCaseEventTypes(prefix.toLowerCase());
        }
      }
    }
 
    return {};
  }
 

 
