dmaf.addEventListener("load_core", function load_Utils (DMAF) {
    var INT = "int",
        FLOAT = "float",
        STRING = "string",
        BOOLEAN = "boolean",
        UID = 0,
        logicMIDIMap = {
            cflat: -1,
            c: 0,
            csharp: 1,
            dflat: 1,
            d: 2,
            dsharp: 3,
            eflat: 3,
            e: 4,
            esharp: 5,
            fflat: 4,
            f: 5,
            fsharp: 6,
            gflat: 6,
            g: 7,
            gsharp: 8,
            aflat: 8,
            a: 9,
            asharp: 10,
            bflat: 10,
            b: 11,
            bsharp: 12
        };
    DMAF.Utils = {
        ajax: function (src, callback, options) {
            var xhr = new XMLHttpRequest(),
                returnArgs = [],
                callbacks = [callback],
                onerror;

            if (options) {
                if (options.override) xhr.overrideMimeType(options.override);
                if (options.responseType) xhr.responseType = options.responseType;
                if (options.chain) callbacks = callbacks.concat(options.chain);
                if (options.args) returnArgs = returnArgs.concat(options.args);
            } else {
                options = {};
            }
            onerror = options.fail ? options.fail : function DMAFajaxOnError (e) {
                console.log("DMAF.ajax: Problem with request", src);
            };
            function onload () {
                var context = options && options.context || DMAF,
                    result,
                    success = this.status >= 200 && this.status < 300 || this.status === 304;
                if (!success || !this.response) {
                    return onerror();
                }
                if (options && options.expectType && typeof this.response !== options.expectType) {
                    return onerror();
                }
                result = options.responseXML ? this.responseXML : this.response;
                if (options.responseXML && !this.responseXML) {
                    console.log("Problem with XMLHttpRequest: XML is missing or malformed.", src);
                    return onerror();
                }
                for (var i = 0, ii = callbacks.length; i < ii; i++) {
                    returnArgs.unshift(result);
                    result = callbacks[i].apply(context, returnArgs);
                }
            }
            xhr.onerror = onerror;
            xhr.onload = onload;
            xhr.open('GET', src, true);
            xhr.send();
        },
        clone: function (obj) {
            if (typeof obj !== "object") {
                return {};
            }
            return JSON.parse(JSON.stringify(obj));
        },
        calculateAverage: function (array) {
            var sum = 0, i = 0, ii = array.length;
            for (; i < ii; i++) {
                sum += array[i];
            }
            return sum / array.length;
        },
        dbToJSVolume: function (db) {
            var volume = Math.max(0, Math.round(100 * Math.pow(2, db / 6)) / 100);
            return Math.min(1, volume);
        },
        dbToWAVolume: function (db) {
            return Math.max(0, Math.round(100 * Math.pow(2, db / 6)) / 100);
        },
        capitalize: function (string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },
        createEffectsRecursive: function (lastFx, effectsArray) {
            var effects = [],
                fxProperties, effect;
            for (var i = 0; i < effectsArray.length; i++) {
                fxProperties = effectsArray[i];
                effect = new DMAF.AudioNodes[this.capitalize(fxProperties.id)](fxProperties);
                if (fxProperties.active) {
                    effect.activate(true);
                } else {
                    effect.activate(false);
                }
                effects.push(effect);
                // connect to the previous effect
                lastFx.connect(effect.input);
                lastFx = effect;
            }
            return effects;
        },
        fromString: function (type, value) {
            if (value === "undefined") return undefined;
            switch (type) {
            case "string":
                return value;
            case "boolean":
                return value === "true";
            case "int":
                return parseInt(value, 10);
            case "float":
                return parseFloat(value);
            case "list":
                return value.split(separator);
            default:
                console.error("FromString Error: ", type, value);
            }
        },
        MIDIToFrequency: function (midiNote) {
            return 8.1757989156 * Math.pow(2.0, midiNote / 12.0);
        },
        removeWhiteSpace: function (string) {
            return string.replace(/\s+/g, "");
        },
        toMIDINote: function (logicNote) {
            var midiNote, note, mod, octave, octavePosition;
            if (logicNote[1] === "#" || logicNote[1].toLowerCase() === "s") {
                note = logicNote[0].toLowerCase() + "sharp";
                octavePosition = 2;
            } else if (logicNote[1] === "b") {
                note = logicNote[0].toLowerCase() + "flat";
                octavePosition = 2;
            } else {
                note = logicNote[0].toLowerCase();
                octavePosition = 1;
            }
            note = logicMIDIMap[note];
            if (logicNote[octavePosition] === "-") {
                octave = ((0 - parseInt(logicNote[octavePosition + 1], 10)) + 2) * 12;
                //negative octave (logic maps midi note 0 as C-2)
            } else {
                octave = (parseInt(logicNote[octavePosition], 10) + 2) * 12;
            }
            midiNote = octave + note;
            return midiNote;
        },
        getFileFormat: function (formats) {
            var a = document.createElement('audio'),
                checks = {
                    "wav": 'audio/wav; codecs="1"',
                    "mp3": 'audio/mpeg;',
                    "aac": 'audio/mp4; codecs="mp4a.40.2"',
                    "ogg": 'audio/ogg; codecs="vorbis"'
                };
            function canPlayFormat(format) {
                return !!(a.canPlayType && a.canPlayType(checks[format] || "").replace(/no/, ""));
            }
            for (var i = 0, ii = formats.length; i < ii; i++) if (canPlayFormat(formats[i])) {
                DMAF.fileFormat = "." + formats[i];
                return;
            }
            console.error("Couldn't play any of the wanted file formats!");
            DMAF.fileFormat = null;
        },
        verify: function (model, value, name) {
            var error;
            if (typeof model === "string") {
                model = this.defaults[model];
            }
            if (value === undefined) {
                return model["default"];
            }
            if (model.type === undefined) {
                console.error("DMAF Verification Error: Malformed defaults object.");
            }
            switch (model.type) {
            case "int":
                if (parseFloat(value) !== parseInt(value, 10)) {
                    error = typeError;
                }
                if (isNaN(value)) {
                    error = typeError;
                }
                if (value < model.min) {
                    error = rangeErrorMin;
                }
                if (value > model.max) {
                    error = rangeErrorMax;
                }
                break;
            case "float":
                if (isNaN(value)) {
                    error = typeError;
                }
                if (value < model.min) {
                    error = rangeErrorMin;
                }
                if (value > model.max) {
                    error = rangeErrorMax;
                }
                break;
            case "string":
                if (typeof value !== "string") {
                    error = typeError;
                }
                break;
            case "list":
                if (!(value instanceof Array)) {
                    error = typeError;
                }
                break;
            case "enum":
                if (model.values) {
                    if (model.values.indexOf(value) === -1) {
                        error = listError;
                    } else {
                        break;
                    }
                } else {
                    console.error("DMAF Verification Error! Missing values list for enum type value.");
                    error = true;
                }
                break;
            case "boolean":
                if (typeof value !== "boolean") {
                    error = typeError;
                }
                break;
            default:
                console.error("DMAF Verification Error! Malformed defaults object. Please check the descriptors.xml");
            }
            if (!error) {
                return value;
            } else {
                error(value, model);
                return model["default"];
            }
        }
    };
    function typeError(value, model) {
        console.log("DMAF TypeError for " + model.name + ": " + value + " is not of type " + model.type);
        return model["default"];
    }

    function rangeErrorMin(value, model) {
        console.log("DMAF RangeError for " + model.name + ": " + value + " is below minimum threshold.");
        return model.min;
    }

    function rangeErrorMax(value, model) {
        console.log("DMAF RangeError for " + model.name + ": " + value + " is above maximum threshold.");
        return model.max;
    }

    function listError(value, model) {
        console.log("DMAF enumError for " + model.name + ": " + value + " is not an allowed value");
        return model["default"];
    }
});