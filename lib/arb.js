/*
 * Copyright 2012 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Application Resource Bundle (ARB) supporting library.
 * This library provides a set of API to access resource stored in ARB and
 * methods to localize the HTML DOM tree using those resources.
 * @author shanjian@google.com (Shanjian Li)
 */


/**
 * Creates arb namespace.
 */
var arb = {};


/**
 * This is the global resource selector that can be used to switch locale,
 * scheme, etc. globally. Empty string is a valid value that means no global
 * selector.
 * @type {string}
 * @private
 */
arb.resourceSelector_ = '';


/**
 * Sets resource selector. This will affect all future resource selection.
 *
 * @param {string} selector resource selection string joined by ':'.
 */
arb.setResourceSelector = function(selector) {
  arb.resourceSelector_ = selector;
};


/**
 * DOM text node type.
 */
arb.TEXT_NODE_TYPE = 3;


/**
 * Cross-browser function for setting the text content of an element.
 * Code is borrowed from Closure.
 *
 * @param {Element} element The element to change the text content of.
 * @param {string} text The string that should replace the current element
 *     content.
 * @private
 */
arb.setTextContent_ = function(element, text) {
  if ('textContent' in element) {
    element.textContent = text;
  } else if (element.firstChild &&
             element.firstChild.nodeType == arb.TEXT_NODE_TYPE) {
    // If the first child is a text node we just change its data and remove the
    // rest of the children.
    while (element.lastChild != element.firstChild) {
      element.removeChild(element.lastChild);
    }
    element.firstChild.data = text;
  } else {
    var child;
    while ((child = element.firstChild)) {
      node.removeChild(child);
    }
    element.appendChild(element.ownerDocument.createTextNode(text));
  }
};


/**
 * Performs message substitution in DOM tree.
 */
arb.localizeHtml = function() {
  var resource = arb.getResource();
  arb.localizeSubtree(document, resource);
};


/**
 * Localizes a DOM subtree start from given elem.
 *
 * @param {Document | Element} elem the root of the subtree to be visited.
 * @param {Object.<string, string|Object>} resource ARB resource object.
 */
arb.localizeSubtree = function(elem, resource) {
  if (elem) {
    var origResource = resource;
    // If namespace is specified in the element, use it in its scope.
    if (elem.getAttribute && elem.getAttribute('arb:namespace')) {
      resource = arb.getResource(elem.getAttribute('arb:namespace')) ||
          resource;
    }

    // If no resource specified, don't do anything. There is nothing wrong
    // about it. A page can choose to skip localization this way.
    if (resource) {
      arb.localizeNode(elem, resource);
      for (var i = 0; i < elem.childNodes.length; i++) {
        var child = elem.childNodes[i];
        arb.localizeSubtree(child, resource);
      }
    }
    resource = origResource;
  }
};


/**
 * Localizes a DOM element. Different type of element has different type of
 * attribute to be localized, not necessarily text content.
 *
 * @param {Document | Element} elem the DOM element to be localized.
 * @param {Object.<string, string|Object>} resource resource bundle.
 */
arb.localizeNode = function(elem, resource) {
  var resId = elem.getAttribute && elem.getAttribute('arb:id') || elem.id;

  if (!resId) {
    return;
  }

  switch(elem.nodeName) {
    case 'IMG':
      arb.localizeElement_(elem, resId, resource, ['src', 'alt']);
      break;
    case 'INPUT':
      arb.localizeElement_(elem, resId, resource,
                           ['value', 'placeholder', 'defaultValue']);
      break;
    case 'AREA':
      arb.localizeElement_(elem, resId, resource, ['alt']);
      break;
    case 'OBJECT':
      arb.localizeElement_(elem, resId, resource, ['standby']);
      break;
    case 'OPTION':
      arb.localizeElement_(elem, resId, resource, ['value', 'label']);
      break;
    case 'OPTGROUP':
      arb.localizeElement_(elem, resId, resource, ['label']);
      break;
    case 'STYLE':
      if (resId in resource) {
        if (elem.styleSheet) {
          elem.styleSheet.cssText = resource[resId];
        } else {
          arb.setTextContent_(elem, resource[resId]);
        }
      }
      break;
    default:
      (resId in resource) && arb.setTextContent_(elem, resource[resId]);
  }
};


/**
 * Injects localized resource into element's attribute.
 *
 * @param {Element} elem the DOM element that need to have resource injected.
 * @param {string} resId ARB resource id.
 * @param {Object.<string, string|Object>} resource  ARB resource bundle.
 * @param {Array.<string>} attrs possible attributes in this element that may
 *     take localization resource.
 * @private
 */
arb.localizeElement_ = function(elem, resId, resource, attrs) {
  for (var i = 0; i < attrs.length; i++) {
    var fieldId = resId + '@' + attrs[i];
    (fieldId in resource) && (elem[attrs[i]] = resource[fieldId]);
  }
};


/**
 * Replaces placeholder in string with given values. For the time being
 * {} is used to mark placeholder. Placeholder will only be replaced if
 * a named argument or positional argument is available.
 *
 * @param {string} str message string possibly with placeholders.
 * @param {string} opt_values if it is a map, its key/value will be
 *     interpreted as named argument. Otherwise, it should be interpreted as
 *     positional argument.
 * @return {string} string with placeholder(s) replaced.
 */
arb.msg = function(str, opt_values) {
  // Plural support is an optional feature. When it is desired, developer
  // should include arbplural.js, where arb.processPluralRules_ is defined.
  if (arb.processPluralRules_) {
    str = arb.processPluralRules_(str, opt_values);
  }
  var type = typeof opt_values;
  if (type == 'object' || type == 'function') {
    for (var key in opt_values) {
      var value = ('' + opt_values[key]).replace(/\$/g, '$$$$');
      str = str.replace(new RegExp('\\{' + key + '\\}', 'gi'), value);
    }
  } else {
     for (var i = 1; i < arguments.length; i++) {
       str = str.replace(
           new RegExp('\\{' + (i - 1) + '\\}', 'g'), arguments[i]);
     }
  }
  return str;
};


/**
 * Resource name part as it appears in regular expression.
 * @type {number}
 * @private
 */
arb.RESOURCE_NAME_PART_ = 1;


/**
 * Obtains the resouce name from URL. That will allow resource to be selected
 * through use of url parameter.
 *
 * @return {string} arb name as passed in Url.
 */
arb.getParamFromUrl = function(paramName) {
  var regex = new RegExp('[\\\\?&]' + paramName + '=([^&#]*)', 'i');
  var m = regex.exec(window.location.href);
  return m ? m[arb.RESOURCE_NAME_PART_] : null;
};


/**
 * Maps ARB namespace into ARB instance.
 * @type {Object.<string, Object>}
 * @private
 */
arb.resourceMap_ = {};


/**
 * Checks if an object is empty or not.
 *
 * @param  {Object} obj An object to be checked for emptiness.
 * @return {boolean} true if the object has not direct properties.
 * @private
 */
arb.isEmpty = function(obj) {
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      return false;
    }
  }
  return true;
};


/**
 * Namespace delimiter.
 * @type {string}
 * @private
 */
arb.NAMESPACE_DELIMITER_ = ':';


/**
 * Registers a ARB resource object.
 *
 * @param {string|array.string} namespaces ARB resource object's namespaces.
 *     This parameter can be either a string or an array, the later allows a
 *     resource to be registered under different names.
 * @param {Object.<string, string|Object>} resource ARB resource object.
 */
arb.register = function(namespaces, resource) {
  if (typeof namespaces == 'string') {
    arb.resourceMap_[namespaces] = resource;
  } else {
    for (var i = 0; i < namespaces.length; i++) {
      arb.resourceMap_[namespaces[i]] = resource;
    }
  }
};


/**
 * Calls the callback for all the registerd namespace/locale pairs. This
 * function only iterates through fully qualified namespaces.
 *
 * @param {function(string)} arbCallback
 */
arb.iterateRegistry = function(arbCallback) {
  for (var namespace in arb.resourceMap_) {
    if (arb.resourceMap_.hasOwnProperty(namespace)) {
      arbCallback(namespace);
    }
  }
};


/**
 * Retrieves ARB resource object that best fits selector given. The algorithm
 * of this method tries to satisfy the selector as much as possible, and does
 * it in the specified priority. Selector given to this method takes priority
 * over global resource selector set through "setResourceSelector".
 *
 * @param {?string} opt_selector resource selector used to choose desired ARB
 *        resource object together with global resource selector.
 *
 * @return {Object.<string, string|Object>} The ARB resource object desired.
 *     or empty object if no ARB resource object registered with given
 *     namespace.
 */
arb.getResource = function(opt_selector) {
  var candidates = arb.resourceMap_;
  if (!opt_selector) {
    opt_selector = arb.resourceSelector_;
  } else if (arb.resourceSelector_) {
    opt_selector += arb.NAMESPACE_DELIMITER_ + arb.resourceSelector_;
  }

  // If opt_namespace is not given, default namespace will be used.
  if (opt_selector) {
    // This will only be true if opt_namespace is fully qualified.
    if (opt_selector in arb.resourceMap_) {
        return arb.resourceMap_[opt_selector];
    }

    var parts = opt_selector.split(arb.NAMESPACE_DELIMITER_);
    for (var i = 0; i < parts.length; i++) {
      var newCandidates = {};
      var pattern = new RegExp('(:|^)' + parts[i] + '(:|$)');
      for (var namespace in candidates) {
        if (pattern.test(namespace)) {
          newCandidates[namespace] = candidates[namespace];
        }
      }
      if (!arb.isEmpty(newCandidates)) {
        candidates = newCandidates;
      }
    }
  }

  var minLength = Number.MAX_VALUE;
  var bestNamespace = '';
  for (var namespace in candidates) {
    if (!namespace) { // empty string
      bestNamespace = namespace;
      break;
    }
    var len = namespace.split(arb.NAMESPACE_DELIMITER_).length;
    if (len < minLength) {
      minLength = len;
      bestNamespace = namespace;
    }
  }

  if (arb.resourceMap_.hasOwnProperty(bestNamespace)) {
    return arb.resourceMap_[bestNamespace];
  }
  return {};
};

/**
 * Checks if the given arb instance is in compact form.
 *
 * @param {Object.<string, string|Object>} resource ARB resource object.
 * @return {boolean} true if it is in compact form.
 */
arb.isCompact = function(resource) {
  for (var prop in resource) {
    if (resource.hasOwnProperty(prop) && prop[0] == '@') {
      return false;
    }
  }
  return true;
};


/**
 * Creates namespace for development mode methods.
 */
arb.dbg = {};


/**
 * Returns type of data as identified by resource id.
 * The type information might not be available for specified resource. Empty
 * string will be returned in such case.
 *
 * @param {Object.<string, string|Object>} resource ARB resource object.
 * @param {string} resId resource id.
 *
 * @return {string} type string if available, or empty string.
 */
arb.dbg.getType = function(resource, resId) {
  if (resId.charAt(0) == '@') {
    return 'attr';
  }
  var atResId = '@' + resId;
  if (resource.hasOwnProperty(atResId) &&
      resource[atResId].hasOwnProperty('type')) {
    return resource[atResId]['type'];
  }
  return '';
};


/**
 * Checks if the resource identified by resId is in given context. If the
 * resource has no context or if the desired context is the prefix of
 * resource's context, it will return true as well.
 *
 * @param {Object.<string, string|Object>} resource ARB resource object.
 * @param {string} resId resource id to be checked.
 * @param {string} context context desired.
 *
 * @return {boolean} true if the resource is in given context.
 */
arb.dbg.isInContext = function(resource, resId, context) {
  var contextRegex = new RegExp('^' + context + '($|:.*)');
  var atResId = '@' + resId;
  return resId.charAt(0) != '@' &&
      (!resource.hasOwnProperty(atResId) ||
       !resource[atResId].hasOwnProperty('context') ||
       contextRegex.test(resource[atResId]['context']));
};


/**
 * Returns the value of an attribute for a resource. Empty string will
 * be returned if attribute is not available.
 *
 * @param {Object.<string, string|Object>} resource ARB resource object.
 * @param {string} resId id of the resource to be checked.
 * @param {string} attrName attribute name of interest.
 *
 * @return {string} attribute value desired, or empty string.
 */
arb.dbg.getAttr = function(resource, resId, attrName) {
  var atResId = '@' + resId;
  if (!resource.hasOwnProperty(atResId)) {
    return '';
  }

  var msgAttr = resource[atResId];
  return msgAttr.hasOwnProperty(attrName) ? msgAttr[attrName] : '';
};

/*
 * Copyright 2012 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Application Resource Bundle (ARB) plural support library.
 * This file contains data and methods to provide plural support in ARB
 * message substitution. Plural rules are based on the latest CLDR(1.9)
 * release. It should cover all the languages available in CLDR.
 *
 * @author shanjian@google.com (Shanjian Li)
 */


/**
 * Regular expression to identify plural message.
 * @type {RegExp}
 * @private
 */
arb.PLURAL_RULE_REGEX_ = /^\{\s*(\w+)\s*,\s*plural\s*,(\s*offset:(\d+))?\s*/;


/**
 * The locale used for selecting plural rules.
 * @type {string}
 * @private
 */
arb.pluralLanguage_ = 'en';


/**
 * Sets plural rules locale.
 */
arb.setPluralLanguage = function(language) {
  if (language in arb.pluralRuleMap_) {
    arb.pluralLanguage_ = language;
  } else {
    arb.pluralLanguage_ = '$$';
  }
}


/**
 * Processes plural message.
 * If it is a plural message, a branch selected based on plural rule will be
 * returned for further processing. Otherwise, original message will be
 * returned. In either case, non-plural related placeholder won't be touched.
 *
 * @param {string} str original message string.
 * @param {string} opt_values if it is a map, its key/value will be
 *     interpreted as named argument. Otherwise, it should be interpreted as
 *     positional argument.
 * @return {string} string after plural processing is done.
 * @private
 */
arb.processPluralRules_ = function(str, opt_values) {
  var m = arb.PLURAL_RULE_REGEX_.exec(str);
  if (!m) {
    return str;
  }

  var type = typeof opt_values;
  var arg;
  if (type == 'object' || type == 'function') {
    if (!(m[1] in opt_values)) {
      return str;
    }
    arg = opt_values[m[1]];
  } else {
    var order = parseInt(m[1]);
    if (m[1] != '' + order || order >= arguments.length) {
      return str;
    }
    arg = arguments[order];
  }

  var branches = arb.parseBranches_(str.substring(m[0].length));
  if (!branches) {
    return str;
  }

  if (arg in branches) {
    return branches['' + arg];
  }

  if (typeof arg != 'number') {
    return str;
  }

  var offset = m[3] ? parseInt(m[3]) : 0;

  var rule = arb.getRuleName(arg - offset);

  if (rule in branches) {
    return branches[rule].replace('#', arg - offset);
  }

  if ('other' in branches) {
    return branches['other'].replace('#', arg - offset);
  }

  return str;
};


/**
 * Parses the branches parts of a plural message into a map of selective
 * branches.
 *
 * @param {string} str plural message string to be parsed.
 * @return {?Object.<string, string>} a map of plural key name to plural
 *     select branch or null if parsing failed.
 * @private
 */
arb.parseBranches_ = function(str) {
  var branches = {};
  var regex = /(?:=(\d+)|(\w+))\s+\{/;
  while (true) {
    if (str.charAt(0) == '}') {
      return branches;
    }

    var m = regex.exec(str);
    if (!m) {
      return null;
    }
    var key = m[1] ? m[1] : m[2];
    str = str.substring(m[0].length);
    var openBrackets = 1;
    var i;
    for (i = 0; i < str.length && openBrackets > 0; i++) {
      var ch = str.charAt(i);
      if (ch == '}') {
        openBrackets--;
      } else if (ch == '{') {
        openBrackets++;
      }
    }
    if (openBrackets != 0) {
      return null;
    }

    // grab branch content without ending "}"
    branches[key] = str.substring(0, i - 1);
    str = str.substring(i).replace(/^\s*/, '');
    if (str == '') {
      return null;
    }
  }
};


/**
 * Returns plural rule name based on given number.
 *
 * @param {number} n number for plural selection.
 * @return {string} plural rule name.
 */
arb.getRuleName = function(n) {
  return arb.pluralRules_[arb.pluralRuleMap_[arb.pluralLanguage_]](n);
};


/**
 * Collection of all possible plural rules.
 * This tables is manually created from CLDR 1.9. Size is the biggest concern.
 * @type {Object.<number, function(number):string>}
 * @private
 */
arb.pluralRules_ = {
    // "one": "n is 1"
    0: function(n) {
        return (n == 1) ? 'one' : 'other';
    },

    // "one": "n in 0..1"
    1: function(n) {
        return (n == 0 || n == 1) ? 'one' : 'other';
    },

    // "few": "n mod 100 in 3..10",
    // "zero": "n is 0",
    // "one": "n is 1",
    // "two": "n is 2",
    // "many": "n mod 100 in 11..99"
    2: function(n) {
        return ((n % 100) >= 3 && (n % 100) <= 10 && n == Math.floor(n)) ?
            'few' : (n == 0) ? 'zero' : (n == 1) ? 'one' : (n == 2) ?
            'two' : ((n % 100) >= 11 && (n % 100) <= 99 && n == Math.floor(n)) ?
            'many' : 'other';
    },

    // "few": "n mod 10 in 2..4 and n mod 100 not in 12..14",
    // "one": "n mod 10 is 1 and n mod 100 is not 11",
    // "many": "n mod 10 is 0 or n mod 10 in 5..9 or n mod 100 in 11..14"
    3: function(n) {
        return ((n % 10) >= 2 && (n % 10) <= 4 &&
            ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) ?
            'few' : ((n % 10) == 1 && (n % 100) != 11) ? 'one' :
            ((n % 10) == 0 || ((n % 10) >= 5 && (n % 10) <= 9) ||
            ((n % 100) >= 11 && (n % 100) <= 14) && n == Math.floor(n)) ?
            'many' : 'other';
    },

    // "few": "n is 3",
    // "zero": "n is 0",
    // "one": "n is 1",
    // "two": "n is 2",
    // "many": "n is 6"
    4: function(n) {
        return (n == 3) ? 'few' : (n == 0) ? 'zero' : (n == 1) ? 'one' :
            (n == 2) ? 'two' : (n == 6) ? 'many' : 'other';
    },

    // "one": "n within 0..2 and n is not 2"
    5: function(n) {
        return (n >= 0 && n < 2) ? 'one' : 'other';
    },

    // "two": "n is 2",
    // "one": "n is 1"
    6: function(n) {
        return (n == 2) ? 'two' : (n == 1) ? 'one' : 'other';
    },

    // "few": "n in 2..4",
    // "one": "n is 1"
    7: function(n) {
        return (n == 2 || n == 3 || n == 4) ? 'few' :
            (n == 1) ? 'one' : 'other';
    },

    // "zero": "n is 0",
    // "one": "n within 0..2 and n is not 0 and n is not 2"
    8: function(n) {
        return (n == 0) ? 'zero' : (n > 0 && n < 2) ? 'one' : 'other';
    },

    // "few": "n mod 10 in 2..9 and n mod 100 not in 11..19",
    // "one": "n mod 10 is 1 and n mod 100 not in 11..19"
    9: function(n) {
        return ((n % 10) >= 2 && (n % 10) <= 9 &&
               ((n % 100) < 11 || (n % 100) > 19) && n == Math.floor(n)) ?
               'few' :
               ((n % 10) == 1 && ((n % 100) < 11 || (n % 100) > 19)) ? 'one' :
               'other';
    },

    // "zero": "n is 0",
    // "one": "n mod 10 is 1 and n mod 100 is not 11"
    10: function(n) {
        return (n == 0) ? 'zero' : ((n % 10) == 1 && (n % 100) != 11) ?
            'one' : 'other';
    },

    // "one": "n mod 10 is 1 and n is not 11"
    11: function(n) {
        return ((n % 10) == 1 && n != 11) ? 'one' : 'other';
    },

    // "few": "n is 0 OR n is not 1 AND n mod 100 in 1..19",
    // "one": "n is 1"
    12: function(n) {
        return (n == 1) ? 'one' :
            (n == 0 ||
             (n % 100) >= 11 && (n % 100) <= 19 && n == Math.floor(n)) ?
            'few' : 'other';
    },

    // "few": "n is 0 or n mod 100 in 2..10",
    // "one": "n is 1",
    // "many": "n mod 100 in 11..19"
    13: function(n) {
        return (n == 0 || (n % 100) >= 2 && (n % 100) <= 10 &&
                n == Math.floor(n)) ? 'few' : (n == 1) ? 'one' :
            ((n % 100) >= 11 && (n % 100) <= 19 && n == Math.floor(n)) ?
            'many' : 'other';

    },

    // "few": "n mod 10 in 2..4 and n mod 100 not in 12..14",
    // "one": "n is 1",
    // "many": "n is not 1 and n mod 10 in 0..1 or
    //          n mod 10 in 5..9 or n mod 100 in 12..14"
    14: function(n) {
        return ((n % 10) >= 2 && (n % 10) <= 4 &&
            ((n % 100) < 12 || (n % 100) > 14) && n == Math.floor(n)) ?
            'few' : (n == 1) ? 'one' :
            ((n % 10) == 0 || (n % 10) == 1 ||
             (((n % 10) >= 5 && (n % 10) <= 9) ||
            ((n % 100) >= 12 && (n % 100) <= 14)) && n == Math.floor(n)) ?
            'many' : 'other';
    },

    // "few": "n in 2..10",
    // "one": "n within 0..1"
    15: function(n) {
        return (n >= 2 && n <= 10 && n == Math.floor(n)) ? 'few' :
            (n >= 0 && n <= 1) ? 'one' : 'other';
    },

    // "few": "n mod 100 in 3..4",
    // "two": "n mod 100 is 2",
    // "one": "n mod 100 is 1"
    16: function(n) {
        var m = n % 100;
        return (m == 3 || m == 4) ? 'few' : (m == 2) ? 'two' :
               (m == 1) ? 'one' : 'other';
    },

    // No plural form
    17: function(n) {
        return 'other';
    }
};


/**
 * Mapping of locale to plural rule type.
 * @type {Object}
 * @private
 */
arb.pluralRuleMap_ = {
    'af': 0, 'ak': 1, 'am': 1, 'ar': 2,
    'be': 3, 'bem': 0, 'bg': 0, 'bh': 1, 'bn': 0, 'br': 4, 'brx': 0, 'bs': 3,
    'ca': 0, 'chr': 0, 'ckb': 0, 'cs': 7, 'cy': 4, 'da': 0, 'dz': 0,
    'el': 0, 'en': 0, 'eo': 0, 'es': 0, 'et': 0, 'eu': 0,
    'ff': 5, 'fi': 0, 'fil': 1, 'fo': 0, 'fr': 5, 'fur': 0, 'fy': 0,
    'ga': 6, 'gl': 0, 'gsw': 0, 'gu': 0, 'guw': 1,
    'ha': 0, 'he': 0, 'hi': 1, 'hr': 3,
    'is': 0, 'it': 0, 'iw': 0, 'kab': 5, 'ku': 0,
    'lag': 8, 'lb': 0, 'ln': 1, 'lt': 9, 'lv': 10,
    'mg': 1, 'mk': 11, 'ml': 0, 'mn': 0, 'mo': 12, 'mr': 0, 'mt': 13,
    'nah': 0, 'nb': 0, 'ne': 0, 'nl': 0, 'nn': 0, 'no': 0, 'nso': 1,
    'om': 0, 'or': 0,
    'pa': 0, 'pap': 0, 'pl': 14, 'ps': 0, 'pt': 0,
    'rm': 0, 'ro': 12, 'ru': 3,
    'se': 6, 'sh': 3, 'shi': 15, 'sk': 7, 'sl': 16, 'sma': 6, 'smi': 6,
    'smj': 6, 'smn': 6, 'sms': 6, 'so': 0, 'sg': 0, 'sr': 3, 'sv': 0, 'sw': 0,
    'ta': 0, 'te': 0, 'ti': 1, 'tk': 0, 'tl': 1,
    'uk': 3, 'ur': 0, 'wa': 1, 'zu': 0,
    '$$': 17   // Special item for language without plural rules.
};


/**
 * Make this exportable.
 */

module.exports = arb;

