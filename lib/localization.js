var debug = require('debug')('localization')
  , arb = require('./arb.js')
  , Emitter = require('emitter')
  , Preloader = require('preloader')
  , $ = require('jquery');

// Override arb.setTextContent_ because we want
// to be able to write html.
var setTextContent = arb['setTextContent_'];
arb['setTextContent_'] = function(el,txt){
  $(el).html(txt);
}

// Make arb global so that eval() can find it
window.arb = arb;

module.exports = new Localization('en-US');

function Localization(defaultLanguage){
  this.defaultLanguage = defaultLanguage;
  this.currentLanguage = defaultLanguage;
  this.availableLanguages = [];
  this.availablePriorities = [];
  this.acceptedLanguages = [];
}

Localization.prototype.parse = function(header){
  debug('parse',header)
  this.acceptedLanguages = parseParams(header);
  return this;
}

Localization.prototype.setLanguage = function(code){
  debug('set language',code)
  if( code != this.currentLanguage ){
    if( ~this.availableLanguages.indexOf(code) ){
      arb.setResourceSelector('cubeslam:'+code);
      arb.localizeHtml();
      this.currentLanguage = code;
    } else {
      console.warn('Language "%s" is not available.',code)
    }
  }
  return this;
}

Localization.prototype.sortLanguages = function(){
  this.sortedAvailable = [];
  for(var i=0; i<this.acceptedLanguages.length; i++){
    var acc = this.acceptedLanguages[i];
    var isAvailable = ~this.availableLanguages.indexOf(acc.value);
    if( isAvailable ){
      this.sortedAvailable.push(acc.value);
    }
  }
  if( !~this.sortedAvailable.indexOf(this.defaultLanguage) ){
    this.sortedAvailable.push(this.defaultLanguage);
  }
  return this;
}

Localization.prototype.nextLanguage = function(){
  // find the index of the current language
  var curr = this.sortedAvailable.indexOf(this.currentLanguage);
  var next = this.sortedAvailable[(curr+1)%this.sortedAvailable.length];
  return this.setLanguage(next);
}

Localization.prototype.register = function(code,priority){
  debug('register',code,priority)
  var shortCode = code.split('-')[0];

  for( var i=0; i<this.availableLanguages.length; i++ ){
    var l = this.availableLanguages[i];
    var p = this.availablePriorities[i];
    if( l.indexOf(shortCode) === 0 ){
      if( p < priority ){
        debug('replacing "%s" with "%s"',shortCode,code)
        this.availableLanguages.splice(i,1,code);
        this.availablePriorities.splice(i,1,priority);
      } else {
        debug('skipping "%s" because of "%s"',code,l)
      }
      return;
    }
  }

  // or we simply add this as a new language
  this.availableLanguages.push(code);
  this.availablePriorities.push(priority);
  return this;
}

Localization.prototype.load = function(fn){
  var self = this;

  // Clear available languages
  this.availableLanguages = [];
  this.availablePriorities = [];

  // Load each accepted language in parallel.
  var batch = new Preloader();
  for(var i=0; i<this.acceptedLanguages.length; i++){
    var code = this.acceptedLanguages[i].value;
    var prio = this.acceptedLanguages.length-i;
    batch.push(load(code,prio));
  }
  // Always keep the default languages as last option
  // (unless it already exists).
  batch.push(load(this.defaultLanguage,0));
  batch.end(function(){
    // pre-render a sorted list of the available
    // languages
    self.sortLanguages()
    // set the first available language
    var lang = self.sortedAvailable[0] || self.defaultLanguage;
    self.setLanguage(lang);
    fn && fn();
  });

  function load(code,priority){
    debug('to load',code)
    var path = '/lang/'+code+'.arb';
    return function(next){
      debug('loading',path)
      $.getScript(path)
        .done(function(){
          self.register(code,priority);
          next();
        })
        .fail(function(){
          // console.warn('failed to load "%s"',path,arguments);
          // ignoring errors because it will just not "register"
          next();
        })
    }
  }
  return this;
}

function parseParams(str){
  return str
    .split(/ *, */)
    .map(acceptParams)
    .filter(function(obj){
      return obj.quality;
    })
    .sort(function(a, b){
      if (a.quality === b.quality) {
        return a.originalIndex - b.originalIndex;
      } else {
        return b.quality - a.quality;
      }
    });
}

function acceptParams(str, index) {
  var parts = str.split(/ *; */);
  var ret = { value: parts[0], quality: 1, params: {}, originalIndex: index };

  for (var i = 1; i < parts.length; ++i) {
    var pms = parts[i].split(/ *= */);
    if ('q' == pms[0]) {
      ret.quality = parseFloat(pms[1]);
    } else {
      ret.params[pms[0]] = pms[1];
    }
  }

  return ret;
}