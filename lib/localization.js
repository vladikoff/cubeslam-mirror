var arb = require('./arb.js')
  , Emitter = require('emitter')
  , $ = require('jquery');

// Override standard arb register, to emit events.
var register = arb.register;
arb.register = function(n) {
  register.apply(this, arguments);

  if (typeof n == 'string') {
    localization.emit('new', n);
  } else {
    for (var i = 0; i < n.length; i++) {
      localization.emit('new', n);
    }
  }
};

// We are emitting those events:
// * new - each time a new language was registered by arb.
// * load - when loading all languages was finished.
// * changed - each time the language of the site changed.

var localization = {
  currentLanguage: 'en', // HTML is in this language, so this is the default.
  acceptLanguages: [],
  maxLanguages: 2,
  genericLanguage: 'en',
  languages: {},
  init: function(acceptLanguage) {

    // Store was languages are accepted by the visitor. Check for dupes and only store the language code without country/quality stuff.
    acceptLanguage = (acceptLanguage || '').split(',');
    for (var i = 0; i < acceptLanguage.length; i++) {
      if (acceptLanguage[i].length >= 2) {
        acceptLanguage[i] = acceptLanguage[i].substr(0,2);
        if (this.acceptLanguages.indexOf(acceptLanguage[i]) == -1) {
          this.acceptLanguages.push(acceptLanguage[i]);
        }
      }
    }

    $.ajax({
      'url': '/build/localization.arb', // All arb stuff should go in this file.
      'dataType': 'text',
      'success': function(arbData) {
        eval(arbData); // Run arb.register
        this.emit('load');
      }.bind(this)
    });

    // When localization data is loaded the first time,
    // set language to the user's primary Accept-Language (that we support):
    this.once('load', function() {
      if (this.acceptLanguages.length > 0) {
        this.setLanguage(this.acceptLanguages[0]);
      }
    });

    // This listener is fired when a new language is registered by arb.
    this.on('new', function(namespace) {
      var language = namespace;
      if (language.indexOf(':') != -1) { // Get the language code without countrycode, quality setting, etc.
        language = namespace.substr(language.indexOf(':') + 1);
      }
      if (language.length >= 2) { // Empty strings are/was common in Accept-Language, so we have to check the length.
        language = language.substr(0, 2);
        if (this.acceptLanguages.indexOf(language) != -1) {
          if (typeof(this.languages[language]) == 'undefined') {
            this.languages[language] = [];
          }
          this.languages[language].push(namespace);  // Add the resource namespace to this language.
        }
      }

    }.bind(this));

  },

  // Change language of the site.
  setLanguage: function(language) {
    if (language != this.currentLanguage) {
      var availLanguages = this.availLanguages();
      if (availLanguages.indexOf(language) != -1) {
        this.currentLanguage = language;
        for (var i = 0; i < this.languages[this.currentLanguage].length; i++) {
          arb.setResourceSelector(this.languages[this.currentLanguage][i]);
          arb.localizeHtml();
        }
        this.emit('changed');
      } else {
        console.log('Language is not available.');
      }
    }
  },

  // Change to the next language.
  nextLanguage: function() {
    var availLanguages = this.availLanguages();
    var index = availLanguages.indexOf(this.currentLanguage);
    index += 1;
    if (index >= availLanguages.length) {
      index = 0;
    }
    this.setLanguage(availLanguages[index]);
  },

  // Returns the available languages in the order they came as "accepted" from the Accept-Language http header,
  // not more than maxLanguages, and with genericLanguage always included.
  // If the generic language is the first Accept-Language language, then only return the generic language.
  availLanguages: function() {
    var r = [];
    for (var i in this.acceptLanguages) {
      var lang = this.acceptLanguages[i];
      if (typeof(this.languages[lang]) != 'undefined') {
        r.push(lang);
        if (r.length == 1 && r[0] == this.genericLanguage) { // Only return the generic language if it was the first Accept-Language language.
          return r;
        } else if (r.length == this.maxLanguages - 1 && r.indexOf(this.genericLanguage) == -1) { // Include genericLanguage if it is not there yet and there is only one position left to fill.
          r.push(this.genericLanguage);
          break;
        } else if (r.length == this.maxLanguages) { // Do not return more than maxLanguages.
          break;
        }
      }
    }
    // Always include the generic language:
    if (r.indexOf(this.genericLanguage) == -1) {
      r.push(this.genericLanguage);
    }
    return r;
  }

}

Emitter(localization);

module.exports = localization;
