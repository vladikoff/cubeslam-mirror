dmaf.addEventListener("load_core", function (DMAF) {
    var colon = /[:]/;
    DMAF.registerInstance = function (type, id, constructor, doNotManage) {
        DMAF[type] = DMAF[type] || Object.create(null);
        DMAF[type].ids = DMAF[type].ids || [];
        DMAF[type].ids.push(id);
        //Quick fix...look into capitalization of descriptors
        var nocap = id.charAt(0).toLowerCase() + id.slice(1);
        constructor.prototype.defaults = DMAF.Settings.descriptors.action[type][nocap] || {};
        DMAF[type][id] = new InstanceType(constructor, doNotManage);
    };
    DMAF.getInstance = function (type, instanceId) {
        var keys, key, instance, i = 0;
        keys = DMAF[type].ids;
        for (;(key = keys[i++]);) {
            instance = this[type][key].getInstance(instanceId);
            if (instance) return instance;
        }
        return null;
    };
    DMAF.getInstance = verifyQueryPartial(DMAF.getInstance);
    DMAF.getInstanceProperty = function (type, instanceId, properties) {
        var instance = DMAF.getInstance(type, instanceId);
        if (!instance) {
            console.log("missing instance", type, instanceId);
            return null;
        }
        property = instance;
        for (var i = 0, ii = properties.length; i < ii; i++) {
            if (typeof property !== "undefined" &&
                    (typeof property === "object" || typeof property === "function")) {
                property = property[properties[i]];
            } else {
                break;
            }
        }
        if (i !== ii) {
            console.log("Could not find property.");
            return null;
        }
        return property;
    };
    DMAF.getInstanceProperty = verifyQueryPartial(DMAF.getInstanceProperty);
    DMAF.addInstance = function (instance) {
        if (!this.InstancePrototype.isPrototypeOf(instance)) {
            console.log("DMAF.addInstance may only be used with DMAF instances");
            console.trace();
            return;
        }
        DMAF[instance.type][instance.id].addInstance(instance);
    };
    DMAF.removeInstance = function (type, instanceId) {
        var instance = this.getInstance(type, instanceId);
        if (instance) {
            return this[instance.type][instance.id].removeInstance(instanceId);
        } else {
            console.log("DMAF.remove: Could not find instance", type, instanceId);
            return false;
        }
    };
    DMAF.removeInstance = verifyQueryPartial(DMAF.removeInstance);
    DMAF.InstancePrototype = {
        audioParam: (function () {
            var gain = DMAF.context.createGainNode().gain;
            return Object.getPrototypeOf(gain.constructor.prototype);
        })(),
        setInitProperties: function (properties) {
            var keys = Object.keys(properties), key, i = 0;
            for (;(key = keys[i++]);) {
                this[key] = properties[key];
            }
            this.setDynamicValues();
            return this;
        },
        init: function () {
            return this;
        },
        onAction: function () {
            return this;
        },
        returnChildInstance: function (targetParameter) {
            var chain, key, i, ii, child;
            if (colon.test(targetParameter)) {
                chain = targetParameter.split(colon);
                if (chain.length && chain.length > 1) {
                    child = this;
                    for (i = 0, ii = chain.length; i < ii; i++) {
                        key = chain[i];
                        child = child[key];
                        if (typeof child !== "object") return {instance: this, ref: targetParameter};
                        if (DMAF.InstancePrototype.isPrototypeOf(child)) {
                            chain = chain.slice(i + 1).join(":");
                            return child.returnChildInstance(chain);
                        }
                    }
                }
            }
            return {instance: this, ref: targetParameter};
        },
        setProperty: function (targetParameter, value, duration, actionTime) {
            var chain, i, ii, key,
                targetProperty, def, param, method,
                nested = this.returnChildInstance(targetParameter);
            if (nested.instance !== this) {
                return nested.instance.setProperty(nested.ref, value, duration, actionTime);
            } else {
                if (colon.test(targetParameter)) {
                    console.log("DMAF Does not support colon syntax for properties within arrays.");
                    return;
                } else {
                    if (this[targetParameter] !== undefined) {
                        value = this.verify(targetParameter, value);
                    } else {
                        console.log(targetParameter, "is not a valid property for instance type", this.id);
                        return;
                    }
                }
            }
            if (this.audioParam.isPrototypeOf(this[targetParameter])) {
                if (actionTime < DMAF.context.currentTime * 1000) {
                    //console.log("actionTime", actionTime, "was before current Time", DMAF.context.currentTime * 1000);
                    actionTime = DMAF.context.currentTime * 1000;
                }
                actionTime = actionTime ? actionTime / 1000 : DMAF.context.currentTime;
                duration = duration = duration ? duration / 1000 : 0;
                if(!duration) {
                    method = "setValueAtTime";
                } else {
                    method = "linearRampToValueAtTime";
                }
                this[targetParameter].cancelScheduledValues(actionTime);
                this[targetParameter].setValueAtTime(this[targetParameter].value, actionTime);
                this[targetParameter][method](value, duration + actionTime);
            } else {
                this[targetParameter] = value;
            }
        },
        setDynamicValues: function () {
            var vals = this._dynamicValues, key, string, value;
            if (!vals) return;
            for (var i = 0, ii = vals.length; i < ii; i++) {
                string = vals[i].string || "string_not_defined";
                key = vals[i].key;
                value = DMAF.getInstanceProperty(string);
                this[key] = this.verify(key, value);
            }
            return this;
        },
        verify: function (key, value, descriptor) {
            var model, error, chain;
            model = descriptor ? descriptor : this.defaults[key],
            error = !!model;
            error = value === undefined;
            switch (model.type) {
                case "int":
                    error = (parseFloat(value) !== parseInt(value, 10));
                    value = parseInt(value, 10);
                    error = isNaN(value);
                    error = !isFinite(value);
                    error = typeof value !== "number";
                    if (value < model.min) value = model.min;
                    if (value > model.max) value = model.max;
                    break;
                case "float":
                    error = isNaN(parseFloat(value));
                    error = !isFinite(value);
                    error = typeof value !== "number";
                    value = parseFloat(value);
                    if (value < model.min) value = model.min;
                    if (value > model.max) value = model.max;
                    break;
                case "string":
                    error = typeof value !== "string";
                    break;
                case "list":
                    error = !(value instanceof Array);
                    break;
                case "enum":
                    error = model.value.indexOf(value) === -1;
                    break;
                case "array":
                    console.log("Array type found in verify", key, value, descriptor);
                    break;
                case "boolean":
                    error = typeof value !== "boolean";
                    break;
            }
            if (!error) {
                return value;
            } else {
                console.log("DMAF Verification error", key, value, this);
                return model["default"];
            }
        }
    };
    DMAF.setValueAtTime = function (obj, param, value, actionTime) {
        DMAF.Clock.checkFunctionTime(actionTime, function () {
            obj[param] = value;
        }, [], DMAF);
    };
    function InstanceType (constructor, doNotManage) {
        this.activeInstances = Object.create(null);
        this.constructor = constructor;
        this.isManaged = !doNotManage;
    }
    InstanceType.prototype = {
        getInstance: function (instanceId) {
            return this.activeInstances[instanceId];
        },
        removeInstance: function (instanceId) {
            return delete this.activeInstances[instanceId];
        },
        addInstance: function (instance) {
            this.activeInstances[instance.instanceId] = instance;
        },
        createInstance: function (properties) {
            var instance = new this.constructor(properties);
            instance.setInitProperties(properties).init(properties);
            if (this.isManaged) DMAF.addInstance(instance);
            return instance;
        }
    };
    //Verifies a top-level query either using colon syntax or type/instanceId as separate args
    function verifyQueryPartial (f) {
        return function (string) {
            var args, propString;
            if (colon.test(string)) {
                args = string.split(colon);
                if (args.length > 2) { //Is property string
                    propString = args.slice(2);
                    args.length = 2;
                    args.push(propString);
                }
            } else {
                args = arguments;
            }
            if (!args[0]) {
                console.log("Missing arguments!");
                return null;
            }
            if (!DMAF[args[0]]) {
                console.log("Invalid type!", args[0]);
                return null;
            }
            return f.apply(DMAF, args);
        };
    }
});