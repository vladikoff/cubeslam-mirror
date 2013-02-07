dmaf.once("load_audioRouter", function (DMAF) {
    var type = "audioRouter",
        Super = DMAF.InstancePrototype;

    //Instance constructor
    function AudioBus () {
        this.input = DMAF.context.createGainNode();
        this.output = DMAF.context.createGainNode();
    }

    //Instance prototype. Inherited methods etc.
    AudioBus.prototype = Object.create(Super, {
        init: {
            value: function (properties) {
                var lastFx = this.input;
                this.effects = DMAF.Utils.createEffectsRecursive(this.input, properties.audioNodes);
                if (this.effects.length > 0) {
                    lastFx = this.effects[this.effects.length - 1];
                }
                lastFx.connect(this.output);
                if (this.outputBus === "master") {
                    this.output.connect(DMAF.context.destination);
                } else {
                    var outputBus = DMAF.getInstance(type, this.outputBus);
                    this.output.connect(outputBus ? outputBus.input : DMAF.context.destination);
                }
            }
        },
        volume: {
            get: function () {
                return this.output.gain;
            },
            set: function (value) {
                this.output.gain.value = DMAF.Utils.dbToWAVolume(value);
            }
        },
        getAutomatableProperties: {
            value: function (property) {
                if (property.substring(0, 2) == "fx") {
                    return this.effects[parseInt(property.substring(2), 10)];
                }
            }
        },
        setAutomatableProperty: {
            value: function (property, value, duration, actionTime) {
                var method = duration > 0 ? "linearRampToValueAtTime" : "setValueAtAtTime";
                switch (property) {
                case "volume":
                    value = parseFloat(value);
                    property = "gain";
                    break;
                case "pan":
                    break;
                default:
                    return; //Needs value/property checks if more properties are to be added.
                }
                this.output[property].cancelScheduledValues(DMAF.context.currentTime);
                this.output[property].setValueAtTime(this.output[property].value, DMAF.context.currentTime);
                this.output[property][method](value, (actionTime + duration) / 1000);
            }
        },
        onAction: {
            value: function () {}
        }
    });
    
    //Add to DMAF
    DMAF.registerInstance(type, "AudioBus", AudioBus);
});