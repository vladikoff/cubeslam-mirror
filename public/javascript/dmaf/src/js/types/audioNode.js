dmaf.once("load_audioNode", function (DMAF) {
    var AudioNodes = DMAF.AudioNodes = Object.create(null),
        filterTypes = {
            lowpass: 0,
            highpass: 1,
            bandpass: 2,
            lowshelf: 3,
            highshelf: 4,
            peaking: 5,
            notch: 6,
            allpass: 7
        },
        delayConstants = {
            //  32nd Note
            "32": 0.125,
            //  16th Note triplet
            "16T": 0.16666666666666666,
            //  Dotted 32nd Note
            "32D": 0.1875,
            //  16th Note
            "16": 0.25,
            //  8th Note Triplet
            "8T": 0.3333333333333333,
            //  Dotted 16th Note
            "16D": 0.375,
            //  8th note
            "8": 0.5,
            //  Quarter Note Triplet
            "4T": 0.6666666666666666,
            //  Dotted Eighth Note
            "8D": 0.75,
            //  Quarter Note
            "4": 1,
            //  Half Note Triplet
            "2T": 1.3333333333333333,
            //  Dotted Quarter Note
            "4D": 1.5,
            //  Half Note
            "2": 2,
            //  Dotted Half Note
            "2D": 3,
            //  Whole Note
            "1": 4
        },
        pipe = function (param, val) {
            param.value = val;
        },
        Super = Object.create(DMAF.InstancePrototype, {
            activate: {
                writable: true,
                value: function (doActivate) {
                    this.input.disconnect();
                    this._activated = doActivate;
                    if(doActivate) {
                        this.input.connect(this.activateNode);
                        if(this.activateCallback) {
                            this.activateCallback(doActivate);
                        }
                    } else {
                        this.input.connect(this.output);
                    }
                }
            },
            bypass: {
                get: function () {
                    return this._activated;
                },
                set: function (v) {
                    this.activate(v);
                }
            },
            connect: {
                value: function (target) {
                    this.output.connect(target);
                }
            },
            connectInOrder: {
                value: function (nodeArray) {
                    var i = nodeArray.length - 1;
                    while(i--) {
                        if(!nodeArray[i].connect) {
                            return console.error("AudioNode.connectInOrder: TypeError: Not an AudioNode.", nodeArray[i]);
                        }
                        nodeArray[i].connect(nodeArray[i + 1]);
                    }
                }
            },
            setAutomatableProperty: {
                value: function (property, value, duration, actionTime) {
                    var _is = this.defaults[property],
                        param = this[property],
                        method;
                    actionTime = actionTime ? ~~ (actionTime / 1000) : DMAF.context.currentTime;
                    duration = duration = duration ? ~~ (duration / 1000) : 0;
                    if(param) {
                        value = this.verify(property, value);
                        if(_is.automatable) {
                            if(!duration) {
                                method = "setValueAtTime";
                            } else {
                                method = "linearRampToValueAtTime";
                                param.cancelScheduledValues(actionTime);
                                param.setValueAtTime(param.value, actionTime);
                            }
                            param[method](value, duration + actionTime);
                        } else {
                            param = value;
                        }
                    } else {
                        console.error("Invalid Property for " + this.name);
                    }
                }
            },
            verify: {
                value: DMAF.Utils.verify
            }
        });
    function tanh (arg) {
        return (Math.exp(arg) - Math.exp(-arg)) / (Math.exp(arg) + Math.exp(-arg));
    }
    function sign (x) {
        return x === 0 ? 1 : Math.abs(x) / x;
    }
    function fmod (x, y) {
        var tmp, tmp2, p = 0,
            pY = 0,
            l = 0.0,
            l2 = 0.0;

        tmp = x.toExponential().match(/^.\.?(.*)e(.+)$/);
        p = parseInt(tmp[2], 10) - (tmp[1] + '').length;
        tmp = y.toExponential().match(/^.\.?(.*)e(.+)$/);
        pY = parseInt(tmp[2], 10) - (tmp[1] + '').length;
        if (pY > p) p = pY;
        tmp2 = (x % y);
        if (p < -100 || p > 20) {
            l = Math.round(Math.log(tmp2) / Math.log(10));
            l2 = Math.pow(10, l);
            return (tmp2 / l2).toFixed(l - p) * l2;
        } else {
            return parseFloat(tmp2.toFixed(-p));
        }
    }
    //---------------------------------------------------------------------------------//
    //-------------------------------AudioNode Subclasses------------------------------//
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.Filter = function (properties) {
        this.input = DMAF.context.createGainNode();
        this.filter = this.activateNode = DMAF.context.createBiquadFilter();
        this.output = DMAF.context.createGainNode();

        this.filter.connect(this.output);

        this.defaults = DMAF.Settings.descriptors.type.audioNode.filter;
        this.frequency = properties.frequency;
        this.Q = properties.resonance;
        this.filterType = properties.filterType;
        this.gain = properties.gain;
    };
    DMAF.AudioNodes.Filter.prototype = Object.create(Super, {
        name: {
            value: "Filter"
        },
        filterType: {
            enumerable: true,
            get: function () {
                return this._filterType;
            },
            set: function (value) {
                this._filterType = this.verify("filterType", value);
                this.filter.type = filterTypes[this._filterType.toLowerCase()];
            }
        },
        Q: {
            enumerable: true,
            get: function () {
                return this.filter.Q;
            },
            set: function (value) {
                this.filter.Q.value = this.verify("Q", value);
            }
        },
        gain: {
            enumerable: true,
            get: function () {
                return this.filter.gain;
            },
            set: function (value) {
                this.filter.gain.value = this.verify("gain", value);
            }
        },
        frequency: {
            enumerable: true,
            get: function () {
                return this.filter.frequency;
            },
            set: function (value) {
                this.filter.frequency.value = this.verify("frequency", value);
            }
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.Cabinet = function (properties) {
        this.input = DMAF.context.createGainNode();
        this.activateNode = DMAF.context.createGainNode();
        this.convolver = this.newConvolver(properties.impulsePath);
        this.makeupNode = DMAF.context.createGainNode();
        this.output = DMAF.context.createGainNode();

        this.activateNode.connect(this.convolver.input);
        this.convolver.output.connect(this.makeupNode);
        this.makeupNode.connect(this.output);

        this.defaults = DMAF.Settings.descriptors.type.audioNode.cabinet;
        this.makeupGain = properties.makeupGain;
        this.convolver.activate(true);
    };
    DMAF.AudioNodes.Cabinet.prototype = Object.create(Super, {
        name: {
            value: "Cabinet"
        },
        makeupGain: {
            enumerable: true,
            get: function () {
                return this.makeupNode.gain;
            },
            set: function (value) {
                this.makeupNode.gain.value = this.verify("makeupGain", value);
            }
        },
        newConvolver: {
            value: function (impulsePath) {
                return new DMAF.AudioNodes.Convolver({
                    impulse: impulsePath,
                    dryLevel: 0,
                    wetLevel: 1
                });
            }
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.Chorus = function (properties) {
        this.input = DMAF.context.createGainNode();
        this.attenuator = this.activateNode = DMAF.context.createGainNode();
        this.splitter = DMAF.context.createChannelSplitter(2);
        this.delayL = DMAF.context.createDelayNode();
        this.delayR = DMAF.context.createDelayNode();
        this.feedbackGainNodeLR = DMAF.context.createGainNode();
        this.feedbackGainNodeRL = DMAF.context.createGainNode();
        this.merger = DMAF.context.createChannelMerger(2);
        this.output = DMAF.context.createGainNode();

        this.lfoL = new DMAF.AudioNodes.LFO({
            target: this.delayL.delayTime,
            callback: pipe
        });
        this.lfoR = new DMAF.AudioNodes.LFO({
            target: this.delayR.delayTime,
            callback: pipe
        });

        this.input.connect(this.attenuator);
        this.attenuator.connect(this.output);
        this.attenuator.connect(this.splitter);
        this.splitter.connect(this.delayL, 0);
        this.splitter.connect(this.delayR, 1);
        this.delayL.connect(this.feedbackGainNodeLR);
        this.delayR.connect(this.feedbackGainNodeRL);
        this.feedbackGainNodeLR.connect(this.delayR);
        this.feedbackGainNodeRL.connect(this.delayL);
        this.delayL.connect(this.merger, 0, 0);
        this.delayR.connect(this.merger, 0, 1);
        this.merger.connect(this.output);

        this.defaults = DMAF.Settings.descriptors.type.audioNode.chorus;
        this.feedback = properties.feedback;
        this.rate = properties.rate;
        this.delay = properties.delay;
        this.depth = properties.depth;
        this.lfoR.phase = Math.PI / 2;
        this.attenuator.gain.value = 0.6934; // 1 / (10 ^ (((20 * log10(3)) / 3) / 20))
        this.lfoL.activate(true);
        this.lfoR.activate(true);
    };
    DMAF.AudioNodes.Chorus.prototype = Object.create(Super, {
        name: {
            value: "Chorus"
        },
        delay: {
            enumerable: true,
            get: function () {
                return this._delay;
            },
            set: function (value) {
                this._delay = 0.0002 * Math.pow(10, this.verify("delay", value) * 2);
                this.lfoL.offset = this._delay;
                this.lfoR.offset = this._delay;
                this._depth = this._depth;
            }
        },
        depth: {
            enumerable: true,
            get: function () {
                return this._depth;
            },
            set: function (value) {
                this._depth = this.verify("depth", value);
                this.lfoL.oscillation = this._depth * this._delay;
                this.lfoR.oscillation = this._depth * this._delay;
            }
        },
        feedback: {
            enumerable: true,
            get: function () {
                return this._feedback;
            },
            set: function (value) {
                this._feedback = this.verify("feedback", value);
                this.feedbackGainNodeLR.gain.value = this._feedback;
                this.feedbackGainNodeRL.gain.value = this._feedback;
            }
        },
        rate: {
            enumerable: true,
            get: function () {
                return this._rate;
            },
            set: function (value) {
                this._rate = this.verify("rate", value);
                this.lfoL._frequency = this._rate;
                this.lfoR._frequency = this._rate;
            }
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.Compressor = function (properties) {
        this.input = DMAF.context.createGainNode();
        this.compNode = this.activateNode = DMAF.context.createDynamicsCompressor();
        this.makeupNode = DMAF.context.createGainNode();
        this.output = DMAF.context.createGainNode();

        this.compNode.connect(this.makeupNode);
        this.makeupNode.connect(this.output);

        this.defaults = DMAF.Settings.descriptors.type.audioNode.compressor;
        this.automakeup = properties.automakeup;
        this.makeupGain = properties.makeupGain;
        this.threshold = properties.threshold;
        this.release = properties.release;
        this.attack = properties.attack;
        this.ratio = properties.ratio;
        this.knee = properties.knee;
    };
    DMAF.AudioNodes.Compressor.prototype = Object.create(Super, {
        name: {
            value: "Compressor"
        },
        computeMakeup: {
            value: function () {
                var magicCoefficient = 4,
                    // raise me if the output is too hot
                    c = this.compNode;
                return -(c.threshold.value - c.threshold.value / c.ratio.value) / magicCoefficient;
            }
        },
        automakeup: {
            enumerable: true,
            get: function () {
                return this._automakeup;
            },
            set: function (value) {
                this._automakeup = this.verify("automakeup", value);
                if(this._automakeup) this.makeupGain = this.computeMakeup();
            }
        },
        threshold: {
            enumerable: true,
            get: function () {
                return this.compNode.threshold;
            },
            set: function (value) {
                this.compNode.threshold.value = this.verify("threshold", value);
                if(this._automakeup) this.makeupGain = this.computeMakeup();
            }
        },
        ratio: {
            enumerable: true,
            get: function () {
                return this.compNode.ratio;
            },
            set: function (value) {
                this.compNode.ratio.value = this.verify("ratio", value);
                if(this._automakeup) this.makeupGain = this.computeMakeup();
            }
        },
        knee: {
            enumerable: true,
            get: function () {
                return this.compNode.knee;
            },
            set: function (value) {
                this.compNode.knee.value = this.verify("knee", value);
                if(this._automakeup) this.makeupGain = this.computeMakeup();
            }
        },
        attack: {
            enumerable: true,
            get: function () {
                return this.compNode.attack;
            },
            set: function (value) {
                this.compNode.attack.value = (this.verify("attack", value) / 1000);
            }
        },
        release: {
            enumerable: true,
            get: function () {
                return this.compNode.release;
            },
            set: function (value) {
                this.compNode.release = this.verify("release", value) / 1000;
            }
        },
        makeupGain: {
            enumerable: true,
            get: function () {
                return this.makeupNode.gain;
            },
            set: function (value) {
                var temp = this.verify("makeupGain", value);
                this.makeupNode.gain.value = DMAF.Utils.dbToWAVolume(temp);
            }
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.Convolver = function (properties) {
        this.input = DMAF.context.createGainNode();
        this.activateNode = DMAF.context.createGainNode();
        this.convolver = DMAF.context.createConvolver();
        this.dry = DMAF.context.createGainNode();
        this.filterLow = DMAF.context.createBiquadFilter();
        this.filterHigh = DMAF.context.createBiquadFilter();
        this.wet = DMAF.context.createGainNode();
        this.output = DMAF.context.createGainNode();

        this.activateNode.connect(this.filterLow);
        this.activateNode.connect(this.dry);
        this.filterLow.connect(this.filterHigh);
        this.filterHigh.connect(this.convolver);
        this.convolver.connect(this.wet);
        this.wet.connect(this.output);
        this.dry.connect(this.output);

        this.defaults = DMAF.Settings.descriptors.type.audioNode.convolver;
        this.dryLevel = properties.dryLevel;
        this.wetLevel = properties.wetLevel;
        this.highCut = properties.highCut;
        this.buffer = properties.impulse;
        this.lowCut = properties.lowCut;
        this.level = properties.level;
        this.filterHigh.type = 0;
        this.filterLow.type = 1;
    };
    DMAF.AudioNodes.Convolver.prototype = Object.create(Super, {
        name: {
            value: "Convolver"
        },
        lowCut: {
            get: function () {
                return this.filterLow.frequency;
            },
            set: function (value) {
                this.filterLow.frequency.value = this.verify("lowCut", value);
            }
        },
        highCut: {
            get: function () {
                return this.filterHigh.frequency;
            },
            set: function (value) {
                this.filterHigh.frequency.value = this.verify("highCut", value);
            }
        },
        level: {
            get: function () {
                return this.output.gain;
            },
            set: function (value) {
                this.output.gain.value = this.verify("level", value);
            }
        },
        dryLevel: {
            get: function () {
                return this.dry.gain;
            },
            set: function (value) {
                this.dry.gain.value = this.verify("dryLevel", value);
            }
        },
        wetLevel: {
            get: function () {
                return this.wet.gain;
            },
            set: function (value) {
                this.wet.gain.value = this.verify("wetLevel", value);
                this.wet.gain = this.verify("wetLevel", value);
            }
        },
        buffer: {
            enumerable: false,
            get: function () {
                return this.convolver.buffer;
            },
            set: function (impulse) {
                var convolver = this.convolver,
                    xhr = new XMLHttpRequest();
                if(!impulse) {
                    console.error("DMAF.AudioNodes.Convolver.setBuffer: Missing impulse path!");
                    return;
                }
                xhr.open("GET", impulse, true);
                xhr.responseType = "arraybuffer";
                xhr.onreadystatechange = function () {
                    if(xhr.readyState === 4) {
                        if(xhr.status < 300 && xhr.status > 199 || xhr.status === 302) {
                            DMAF.context.decodeAudioData(xhr.response, function (buffer) {
                                convolver.buffer = buffer;
                            }, function (e) {
                                if(e) console.error("DMAF.AudioNodes.Convolver.setBuffer: Error decoding data" + e);
                            });
                        }
                    }
                };
                xhr.send(null);
            }
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.Delay = function (properties) {
        //Instantiate AudioNodes
        this.input = DMAF.context.createGainNode();
        this.activateNode = DMAF.context.createGainNode();
        this.dry = DMAF.context.createGainNode();
        this.wet = DMAF.context.createGainNode();
        this.filter = DMAF.context.createBiquadFilter();
        this.delay = DMAF.context.createDelayNode();
        this.feedbackNode = DMAF.context.createGainNode();
        this.output = DMAF.context.createGainNode();

        //Connect the AudioNodes
        this.activateNode.connect(this.delay);
        this.activateNode.connect(this.dry);
        this.delay.connect(this.filter);
        this.filter.connect(this.feedbackNode);
        this.feedbackNode.connect(this.delay);
        this.feedbackNode.connect(this.wet);
        this.wet.connect(this.output);
        this.dry.connect(this.output);

        //Set properties
        this.defaults = DMAF.Settings.descriptors.type.audioNode.delay;
        this.tempoSync = properties.tempoSync;
        if(this.tempoSync) {
            this.subdivision = properties.subdivision;
        }
        this.delayTime = properties.delayTime;
        this.feedback = properties.feedback;
        this.wetLevel = properties.wetLevel;
        this.dryLevel = properties.dryLevel;
        this.cutoff = properties.cutoff;
        this.filter.type = 1;
    };
    DMAF.AudioNodes.Delay.prototype = Object.create(Super, {
        name: {
            value: "Delay"
        },
        tempoListener: {
            value: function (value) {
                this.tempo = value;
                this.delayTime = this.tempo;
            }
        },
        tempoSync: {
            get: function () {
                return this._tempoSync;
            },
            set: function (value) {
                if(value && typeof value === "string") {
                    var player = DMAF.getInstance("player:" + value);
                    if(player) {
                        this.tempo = player.tempo;
                    } else {
                        this.tempo = 90;
                    }
                    this._tempoSync = value;
                    //TODO: Fix this now that DMAF doesn't have internal events.
                    dmaf.addEventListener("tempo_" + this._tempoSync, this.tempoListener.bind(this));
                } else {
                    this._tempoSync = false;
                }
            }
        },
        subdivision: {
            get: function () {
                return this._subdivision;
            },
            set: function (value) {
                this._subdivision = this.verify("subdivision", value);
            }
        },
        tempo: {
            get: function () {
                return this._tempo;
            },
            set: function (value) {
                this._tempo = value;
            }
        },
        delayTime: {
            enumerable: true,
            get: function () {
                return this.delay.delayTime;
            },
            set: function (value) {
                if(this._tempoSync) {
                    this.delay.delayTime.value = this.verify("delayTime", 60 * delayConstants[this.subdivision] / this.tempo);
                } else {
                    this.delay.delayTime.value = this.verify("delayTime", value) / 1000;
                }
            }
        },
        wetLevel: {
            enumerable: true,
            get: function () {
                return this.wet.gain;
            },
            set: function (value) {
                this.wet.gain.value = this.verify("wetLevel", value);
            }
        },
        dryLevel: {
            enumerable: true,
            get: function () {
                return this.dry.gain;
            },
            set: function (value) {
                this.dry.gain.value = this.verify("dryLevel", value);
            }
        },
        feedback: {
            enumerable: true,
            get: function () {
                return this.feedbackNode.gain;
            },
            set: function (value) {
                this.feedbackNode.gain.value = this.verify("feedback", value);
            }
        },
        cutoff: {
            enumerable: true,
            get: function () {
                return this.filter.frequency;
            },
            set: function (value) {
                this.filter.frequency.value = this.verify("cutoff", value);
            }
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.EnvelopeFollower = function (properties) {
        this.input = DMAF.context.createGainNode(), this.jsNode = this.output = DMAF.context.createJavaScriptNode(this.buffersize, 1, 1);

        this.input.connect(this.output);

        // keep this not to reallocate the mix each time
        // when object is connected to a stereo source abs(in) -> max(abs(ins))
        // this.mixBuffer = new Float32Array(this.buffersize);
        this.defaults = DMAF.Settings.descriptors.type.audioNode.envelopeFollower;
        this.attackTime = properties.attackTime;
        this.releaseTime = properties.releaseTime;
        this._envelope = 0;
        this.target = properties.target;
        this.callback = properties.callback;
    };
    DMAF.AudioNodes.EnvelopeFollower.prototype = Object.create(Super, {
        name: {
            value: "EnvelopeFollower"
        },
        buffersize: {
            value: 256
        },
        envelope: {
            value: 0
        },
        sampleRate: {
            value: 44100
        },
        attackTime: {
            enumerable: true,
            get: function () {
                return this._attackTime;
            },
            set: function (value) {
                this._attackTime = this.verify("attackTime", value);
                this._attackC = Math.exp(-1 / this._attackTime * this.sampleRate / this.buffersize);
            }
        },
        releaseTime: {
            enumerable: true,
            get: function () {
                return this._releaseTime;
            },
            set: function (value) {
                this._releaseTime = this.verify("releaseTime", value);
                this._releaseC = Math.exp(-1 / this._releaseTime * this.sampleRate / this.buffersize);
            }
        },
        callback: {
            get: function () {
                return this._callback;
            },
            set: function (value) {
                if(typeof value === "function") {
                    this._callback = value;
                } else {
                    console.error(this.name + ": Callback must be a function! TypeError: ", value);
                }
            }
        },
        target: {
            get: function () {
                return this._target;
            },
            set: function (value) {
                if(typeof value === "object") {
                    this._target = value;
                } else {
                    console.error(this.name + ": Callback must be an AudioParam interface! TypeError: ", value);
                }
            }
        },
        activate: {
            value: function (doActivate) {
                this.activated = doActivate;
                if(doActivate) {
                    this.jsNode.connect(DMAF.context.destination);
                    this.jsNode.onaudioprocess = this.returnCompute(this);
                } else {
                    this.jsNode.disconnect();
                    this.jsNode.onaudioprocess = null;
                }
            }
        },
        returnCompute: {
            value: function (instance) {
                return function (event) {
                    instance.compute(event);
                };
            }
        },
        compute: {
            value: function (event) {
                var count = event.inputBuffer.getChannelData(0).length,
                    channels = event.inputBuffer.numberOfChannels,
                    current, chan, rms, i;
                chan = rms = 0;
                if(channels > 1) { // need to mixdown
                    for(i = 0; i < count; ++i) {
                        for(; chan < channels; ++chan) {
                            current = event.inputBuffer.getChannelData(chan)[i];
                            rms += (current * current) / channels;
                        }
                    }
                } else {
                    for(i = 0; i < count; ++i) {
                        current = event.inputBuffer.getChannelData(0)[i];
                        rms += (current * current);
                    }
                }
                rms = Math.sqrt(rms);

                if(this._envelope < rms) {
                    this._envelope *= this._attackC;
                    this._envelope += (1 - this._attackC) * rms;
                } else {
                    this._envelope *= this._releaseC;
                    this._envelope += (1 - this._releaseC) * rms;
                }
                this._callback(this._target, this._envelope);
            }
        }
    });
    //---------------------------------------------------------------------------------//
    //Equalizer currently non-functional
    DMAF.AudioNodes.Equalizer = (function () {
        var propertyNames = ["frequency", "gain", "Q", "type"];

        function Equalizer(properties) {

            this._defaults = DMAF.Settings.descriptors.type.audioNode.equalizer;
            this.nbands = properties.bands.length;

            for(var i = 0, ii = this._nbands; i < ii; i++) {
                //addBand.call(this, i);
            }

            this.input = DMAF.context.createGainNode();
            this.output = DMAF.context.createGainNode();
            //this.activateNode = this.bands[0];
            this.activateNode = DMAF.context.createGainNode();
            //TODO:
            //Rework equalizer to work with descriptors.
            return;
            /*//Connect the AudioNodes
             this.connectInOrder(this.bands);
             this.bands[this.nbands - 1].connect(this.output);

             //Set properties for each band
             for (i = 0; i < this._nbands; i++) {
                 for (var j = 0, jj = propertyNames.length; j < jj; j++) {
                     var current = "band" + i + ":" + propertyNames[j];
                     this[current] = properties[current];
                 }
             }*/
        }

        function addBandParam(i, param) {
            var access = "band" + i + ":" + param;
            Object.defineProperty(this, access, {
                enumerable: true,
                get: function () {
                    return this.bands[i][param];
                },
                set: function (value) {
                    if(param === "type") {
                        this.bands[i][param] = this.verify(param, value);
                    } else {
                        this.bands[i][param].value = this.verify(param, value);
                    }
                }
            });
            this.defaults[access] = this._defaults[param];
        }

        function addBand(i) {
            this.bands[i] = DMAF.context.createBiquadFilter();
            addBandParam.apply(this, [i, "frequency"]);
            addBandParam.apply(this, [i, "type"]);
            addBandParam.apply(this, [i, "gain"]);
            addBandParam.apply(this, [i, "Q"]);
        }
        return Equalizer;
    })();
    DMAF.AudioNodes.Equalizer.prototype = Object.create(Super, {
        name: {
            value: "Equalizer"
        },
        propertySearch: {
            value: /:bypass|:type|:frequency|:gain|:q/i
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.LFO = (function () {
        function LFO(properties) {
            //Instantiate AudioNode
            this.output = DMAF.context.createJavaScriptNode(256, 1, 1);
            this.activateNode = DMAF.context.destination;

            //Set Properties
            this.defaults = DMAF.Settings.descriptors.type.audioNode.lfo;
            this.type = properties.type; //Currently not used
            this.frequency = properties.frequency;
            this.offset = properties.offset;
            this.oscillation = properties.oscillation;
            this.phase = properties.phase;
            this.target = properties.target;
            this.output.onaudioprocess = this.callback(properties.callback);
        }

        LFO.prototype = Object.create(Super, {
            name: {
                value: "LFO"
            },
            bufferSize: {
                value: 256
            },
            sampleRate: {
                value: 44100
            },
            type: {
                enumerable: true,
                get: function () {
                    return this._type;
                },
                set: function (value) {
                    this._type = this.verify("type", value);
                }
            },
            frequency: {
                get: function () {
                    return this._frequency;
                },
                set: function (value) {
                    this._frequency = this.verify("frequency", value);
                    this._phaseInc = 2 * Math.PI * this._frequency * this.bufferSize / this.sampleRate;
                }
            },
            offset: {
                get: function () {
                    return this._offset;
                },
                set: function (value) {
                    this._offset = this.verify("offset", value);
                }
            },
            oscillation: {
                get: function () {
                    return this._oscillation;
                },
                set: function (value) {
                    this._oscillation = this.verify("oscillation", value);
                }
            },
            phase: {
                get: function () {
                    return this._phase;
                },
                set: function (value) {
                    this._phase = this.verify("phase", value);
                }
            },
            target: {
                get: function () {
                    return this._target;
                },
                set: function (value) {
                    this._target = value;
                }
            },
            activate: {
                value: function (doActivate) {
                    this._activated = doActivate;
                    if(!doActivate) {
                        this.output.disconnect(DMAF.context.destination);
                    } else {
                        this.output.connect(DMAF.context.destination);
                    }
                }
            },
            callback: {
                value: function (callback) {
                    var that = this;
                    return function () {
                        that._phase += that._phaseInc;
                        if(that._phase > 2 * Math.PI) {
                            that._phase = 0;
                        }
                        callback(that._target, that._offset + that._oscillation * Math.sin(that._phase));
                    };
                }
            }
        });
        return LFO;
    })();
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.Overdrive = function (properties) {
        //Instantiate AudioNodes
        this.input = DMAF.context.createGainNode();
        this.activateNode = DMAF.context.createGainNode();
        this.inputDrive = DMAF.context.createGainNode();
        this.waveshaper = DMAF.context.createWaveShaper();
        this.outputDrive = DMAF.context.createGainNode();
        this.output = DMAF.context.createGainNode();

        //Connect AudioNodes
        this.activateNode.connect(this.inputDrive);
        this.inputDrive.connect(this.waveshaper);
        this.waveshaper.connect(this.outputDrive);
        this.outputDrive.connect(this.output);

        //Set Properties
        this.defaults = DMAF.Settings.descriptors.type.audioNode.overdrive;
        this.ws_table = new Float32Array(this.k_nSamples);
        this.drive = properties.drive;
        this.outputGain = properties.outputGain;
        this.curveAmount = properties.curveAmount;
        this.algorithm = properties.algorithmIndex;
    };
    DMAF.AudioNodes.Overdrive.prototype = Object.create(Super, {
        name: {
            value: "Overdrive"
        },
        k_nSamples: {
            value: 8192
        },
        drive: {
            get: function () {
                return this.inputDrive.gain;
            },
            set: function (value) {
                this._drive = this.verify("drive", value);
            }
        },
        curveAmount: {
            get: function () {
                return this._curveAmount;
            },
            set: function (value) {
                this._curveAmount = this.verify("curveAmount", value);
                if(this._algorithmIndex === undefined) {
                    this._algorithmIndex = 0;
                }
                this.waveshaperAlgorithms[this._algorithmIndex](this._curveAmount, this.k_nSamples, this.ws_table);
                this.waveshaper.curve = this.ws_table;
            }
        },
        outputGain: {
            get: function () {
                return this.outputDrive.gain;
            },
            set: function (value) {
                var temp = this.verify("outputGain", value);
                this._outputGain = DMAF.Utils.dbToWAVolume(temp);
            }
        },
        algorithm: {
            get: function () {
                return this._algorithmIndex;
            },
            set: function (value) {
                this._algorithmIndex = this.verify("algorithmIndex", value);
                this.curveAmount = this._curveAmount;
            }
        },
        waveshaperAlgorithms: {
            value: [

            function (amount, n_samples, ws_table) {
                var k = 2 * amount / (1 - amount),
                    i, x;
                for(i = 0; i < n_samples; i++) {
                    x = i * 2 / n_samples - 1;
                    ws_table[i] = (1 + k) * x / (1 + k * Math.abs(x));
                }
            }, function (amount, n_samples, ws_table) {
                var i, x, y;
                for(i = 0; i < n_samples; i++) {
                    x = i * 2 / n_samples - 1;
                    y = ((0.5 * Math.pow((x + 1.4), 2)) - 1) * y >= 0 ? 5.8 : 1.2;
                    ws_table[i] = tanh(y);
                }
            }, function (amount, n_samples, ws_table) {
                var i, x, y, a = 1 - amount;
                for(i = 0; i < n_samples; i++) {
                    x = i * 2 / n_samples - 1;
                    y = x < 0 ? -Math.pow(Math.abs(x), a + 0.04) : Math.pow(x, a);
                    ws_table[i] = tanh(y * 2);
                }
            }, function (amount, n_samples, ws_table) {
                var i, x, y, abx, a = 1 - amount > 0.99 ? 0.99 : 1 - amount;
                for(i = 0; i < n_samples; i++) {
                    x = i * 2 / n_samples - 1;
                    abx = Math.abs(x);
                    if(abx < a) y = abx;
                    else if(abx > a) y = a + (abx - a) / (1 + Math.pow((abx - a) / (1 - a), 2));
                    else if(abx > 1) y = abx;
                    ws_table[i] = sign(x) * y * (1 / ((a + 1) / 2));
                }
            }, function (amount, n_samples, ws_table) { // fixed curve, amount doesn't do anything, the distortion is just from the drive
                var i, x;
                for(i = 0; i < n_samples; i++) {
                    x = i * 2 / n_samples - 1;
                    if(x < -0.08905) {
                        ws_table[i] = (-3 / 4) * (1 - (Math.pow((1 - (Math.abs(x) - 0.032857)), 12)) + (1 / 3) * (Math.abs(x) - 0.032847)) + 0.01;
                    } else if(x >= -0.08905 && x < 0.320018) {
                        ws_table[i] = (-6.153 * (x * x)) + 3.9375 * x;
                    } else {
                        ws_table[i] = 0.630035;
                    }
                }
            }, function (amount, n_samples, ws_table) {
                var a = 2 + Math.round(amount * 14),
                    // we go from 2 to 16 bits, keep in mind for the UI
                    bits = Math.round(Math.pow(2, a - 1)),
                    // real number of quantization steps divided by 2
                    i, x;
                for(i = 0; i < n_samples; i++) {
                    x = i * 2 / n_samples - 1;
                    ws_table[i] = Math.round(x * bits) / bits;
                }
            }]
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.PingPongDelay = function (properties) {
        this.input = DMAF.context.createGainNode();
        this.activateNode = DMAF.context.createGainNode();
        this.dry = DMAF.context.createGainNode();
        this.splitter = DMAF.context.createChannelSplitter(2);
        this.toMono = DMAF.context.createGainNode();
        this.wet = DMAF.context.createGainNode();
        this.feedbackNode = DMAF.context.createGainNode();
        this.delayL = new DMAF.AudioNodes.Delay(properties);
        this.delayR = new DMAF.AudioNodes.Delay(properties);
        this.merger = DMAF.context.createChannelMerger();
        this.output = DMAF.context.createGainNode();

        this.activateNode.connect(this.dry);
        this.activateNode.connect(this.splitter);
        this.splitter.connect(this.toMono, 0, 0);
        this.splitter.connect(this.toMono, 1, 0);
        this.toMono.connect(this.wet);
        this.wet.connect(this.delayL.delay);
        this.feedbackNode.connect(this.delayL.delay);
        this.delayL.delay.connect(this.delayR.delay);
        this.delayR.delay.connect(this.feedbackNode);
        this.delayL.delay.connect(this.merger, 0, 0);
        this.delayR.delay.connect(this.merger, 0, 1);
        this.dry.connect(this.output);
        this.merger.connect(this.output);

        //Set Properties
        this.delayL.feedback = 0;
        this.delayR.feedback = 0;
        this.delayL.wetLevel = 1;
        this.delayR.wetLevel = 1;
        this.delayL.dryLevel = 0;
        this.delayR.dryLevel = 0;

        this.defaults = DMAF.Settings.descriptors.type.audioNode.pingPongDelay;
        this.cutoff = properties.cutoff;
        this.tempoSync = properties.tempoSync;
        if(this.tempoSync) {
            this.subdivision = properties.subdivision;
        }
        this.delayTime = properties.delayTime;
        this.feedback = properties.feedback;
        this.wetLevel = properties.wetLevel;
        this.dryLevel = properties.dryLevel;
    };
    DMAF.AudioNodes.PingPongDelay.prototype = Object.create(Super, {
        name: {
            value: "PingPongDelay"
        },
        tempoSync: {
            get: function () {
                return this._tempoSync;
            },
            set: function (value) {
                var player = value ? DMAF.getInstance("player", value) : null;
                if(player) {
                    this.tempo = player.tempo;
                } else {
                    this.tempo = 120;
                }
                this._tempoSync = this.verify("tempoSync", value);
                this.delayL.tempoSync = this._tempoSync;
                this.delayR.tempoSync = this._tempoSync;
            }
        },
        tempo: {
            get: function () {
                return this._tempo;
            },
            set: function (value) {
                this._tempo = value;
                this.delayL.tempo = value;
                this.delayR.tempo = value;
            }
        },
        subdivision: {
            get: function () {
                return this._subdivision;
            },
            set: function (value) {
                this._subdivision = this.verify("subdivision", value);
                this.delayL.subdivision = this._subdivision;
                this.delayR.subdivision = this._subdivision;
            }
        },
        delayTime: {
            enumerable: true,
            get: function () {
                return this._delayTime;
            },
            set: function (value) {
                if(this._tempoSync) {
                    this._delayTime = this.verify("delayTime", 60 * delayConstants[this.subdivision] / this.tempo);
                    this.delayL.delayTime = this._delayTime;
                    this.delayR.delayTime = this._delayTime;
                } else {
                    this._delayTime = this.verify("delayTime", value) / 1000;
                    this.delayL.delayTime = value;
                    this.delayR.delayTime = value;
                }
            }
        },
        wetLevel: {
            enumerable: true,
            get: function () {
                return this.wet.gain;
            },
            set: function (value) {
                this.wet.gain.value = this.verify("wetLevel", value);
            }
        },
        dryLevel: {
            enumerable: true,
            get: function () {
                return this.dry.gain;
            },
            set: function (value) {
                this.dry.gain.value = this.verify("dryLevel", value);
            }
        },
        feedback: {
            enumerable: true,
            get: function () {
                return this.feedbackNode.gain;
            },
            set: function (value) {
                this.feedbackNode.gain.value = this.verify("feedback", value);
            }
        },
        cutoff: {
            enumerable: true,
            get: function () {
                return this.filter.frequency;
            },
            set: function (value) {
                this.delayL.filter.frequency.value = this.verify("cutoff", value);
                this.delayR.filter.frequency.value = this.verify("cutoff", value);
            }
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.Phaser = function (properties) {
        //Instantiate AudioNodes
        this.input = DMAF.context.createGainNode();
        this.splitter = this.activateNode = DMAF.context.createChannelSplitter(2);
        this.filtersL = [];
        this.filtersR = [];
        this.feedbackGainNodeL = DMAF.context.createGainNode();
        this.feedbackGainNodeR = DMAF.context.createGainNode();
        this.merger = DMAF.context.createChannelMerger(2);
        this.filteredSignal = DMAF.context.createGainNode();
        this.output = DMAF.context.createGainNode();
        this.lfoL = new DMAF.AudioNodes.LFO({
            target: this.filtersL,
            callback: this.callback
        });
        this.lfoR = new DMAF.AudioNodes.LFO({
            target: this.filtersR,
            callback: this.callback
        });

        //Instantiate Left and Right Filter AudioNode Arrays
        var i = this.stage;
        while(i--) {
            this.filtersL[i] = DMAF.context.createBiquadFilter();
            this.filtersR[i] = DMAF.context.createBiquadFilter();
            this.filtersL[i].type = 7;
            this.filtersR[i].type = 7;
        }
        //Connect Nodes
        this.input.connect(this.splitter);
        this.input.connect(this.output);
        this.splitter.connect(this.filtersL[0], 0, 0);
        this.splitter.connect(this.filtersR[0], 1, 0);
        this.connectInOrder(this.filtersL);
        this.connectInOrder(this.filtersR);
        this.filtersL[this.stage - 1].connect(this.feedbackGainNodeL);
        this.filtersL[this.stage - 1].connect(this.merger, 0, 0);
        this.filtersR[this.stage - 1].connect(this.feedbackGainNodeR);
        this.filtersR[this.stage - 1].connect(this.merger, 0, 1);
        this.feedbackGainNodeL.connect(this.filtersL[0]);
        this.feedbackGainNodeR.connect(this.filtersR[0]);
        this.merger.connect(this.output);

        //Set Values
        this.defaults = DMAF.Settings.descriptors.type.audioNode.phaser;
        this.rate = properties.rate;
        this.baseModulationFrequency = properties.baseModulationFrequency;
        this.depth = properties.depth;
        this.feedback = properties.feedback;
        this.stereoPhase = properties.stereoPhase;

        //Activate LFOs
        this.lfoL.activate(true);
        this.lfoR.activate(true);
    };
    DMAF.AudioNodes.Phaser.prototype = Object.create(Super, {
        name: {
            value: "Phaser"
        },
        stage: {
            value: 4
        },
        callback: {
            value: function (filters, value) {
                for(var stage = 0; stage < 4; stage++) {
                    filters[stage].frequency.value = value;
                }
            }
        },
        depth: {
            enumerable: true,
            get: function () {
                return this._depth;
            },
            set: function (value) {
                this._depth = this.verify("depth", value);
                this.lfoL.oscillation = this._baseModulationFrequency * this._depth;
                this.lfoR.oscillation = this._baseModulationFrequency * this._depth;
            }
        },
        rate: {
            enumerable: true,
            get: function () {
                return this._rate;
            },
            set: function (value) {
                this._rate = this.verify("rate", value);
                this.lfoL.frequency = this._rate;
                this.lfoR.frequency = this._rate;
            }
        },
        baseModulationFrequency: {
            enumerable: true,
            get: function () {
                return this._baseModulationFrequency;
            },
            set: function (value) {
                this._baseModulationFrequency = this.verify("baseModulationFrequency", value);
                this.lfoL.offset = this._baseModulationFrequency;
                this.lfoR.offset = this._baseModulationFrequency;
                this._depth = this.verify("depth", this._depth);
            }
        },
        feedback: {
            get: function () {
                return this._feedback;
            },
            set: function (value) {
                this._feedback = this.verify("feedback", value);
                this.feedbackGainNodeL.gain.value = this._feedback;
                this.feedbackGainNodeR.gain.value = this._feedback;
            }
        },
        stereoPhase: {
            get: function () {
                return this._stereoPhase;
            },
            set: function (value) {
                this._stereoPhase = this.verify("stereoPhase", value);
                var newPhase = this.lfoL._phase + this._stereoPhase * Math.PI / 180;
                newPhase = fmod(newPhase, 2 * Math.PI);
                this.lfoR._phase = newPhase;
            }
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.Tremolo = function (actionProperties) {
        //Instantiate AudioNodes
        this.input = DMAF.context.createGainNode();
        this.splitter = this.activateNode = DMAF.context.createChannelSplitter(2), this.amplitudeL = DMAF.context.createGainNode(), this.amplitudeR = DMAF.context.createGainNode(), this.merger = DMAF.context.createChannelMerger(2), this.output = DMAF.context.createGainNode();
        this.lfoL = new DMAF.AudioNodes.LFO({
            target: this.amplitudeL.gain,
            callback: pipe
        });
        this.lfoR = new DMAF.AudioNodes.LFO({
            target: this.amplitudeR.gain,
            callback: pipe
        });

        //Connect AudioNodes
        this.input.connect(this.splitter);
        this.splitter.connect(this.amplitudeL, 0);
        this.splitter.connect(this.amplitudeR, 1);
        this.amplitudeL.connect(this.merger, 0, 0);
        this.amplitudeR.connect(this.merger, 0, 1);
        this.merger.connect(this.output);

        //Set Values
        this.defaults = DMAF.Settings.descriptors.type.audioNode.tremolo;
        this.rate = actionProperties.rate;
        this.intensity = actionProperties.intensity;
        this.stereoPhase = actionProperties.stereoPhase;

        //Set LFO Values
        this.lfoL.offset = 1 - (this.intensity / 2);
        this.lfoR.offset = 1 - (this.intensity / 2);
        this.lfoL.phase = this.stereoPhase * Math.PI / 180;

        //Activate LFOs
        this.lfoL.activate(true);
        this.lfoR.activate(true);
    };
    DMAF.AudioNodes.Tremolo.prototype = Object.create(Super, {
        name: {
            value: "Tremolo"
        },
        intensity: {
            enumerable: true,
            get: function () {
                return this._intensity;
            },
            set: function (value) {
                this._intensity = this.verify("intensity", value);
                this.lfoL.offset = this._intensity / 2;
                this.lfoR.offset = this._intensity / 2;
                this.lfoL.oscillation = this._intensity;
                this.lfoR.oscillation = this._intensity;
            }
        },
        rate: {
            enumerable: true,
            get: function () {
                return this._rate;
            },
            set: function (value) {
                this._rate = this.verify("rate", value);
                this.lfoL.frequency = this._rate;
                this.lfoR.frequency = this._rate;
            }
        },
        steroPhase: {
            enumerable: true,
            get: function () {
                return this._rate;
            },
            set: function (value) {
                this._stereoPhase = this.verify("stereoPhase", value);
                var newPhase = this.lfoL._phase + this._stereoPhase * Math.PI / 180;
                newPhase = fmod(newPhase, 2 * Math.PI);
                this.lfoR.phase = newPhase;
            }
        }
    });
    //---------------------------------------------------------------------------------//
    DMAF.AudioNodes.WahWah = function (properties) {
        //Instantiate AudioNodes
        this.input = DMAF.context.createGainNode();
        this.activateNode = DMAF.context.createGainNode();
        this.envelopeFollower = new DMAF.AudioNodes.EnvelopeFollower({
            target: this,
            callback: function (context, value) {
                context.sweep = value;
            }
        });
        this.filterBp = DMAF.context.createBiquadFilter();
        this.filterPeaking = DMAF.context.createBiquadFilter();
        this.output = DMAF.context.createGainNode();

        //Connect AudioNodes
        this.activateNode.connect(this.filterBp);
        this.filterBp.connect(this.filterPeaking);
        this.filterPeaking.connect(this.output);

        //Set Properties
        this.defaults = DMAF.Settings.descriptors.type.audioNode.wahWah;
        this.init();
        this.automode = properties.enableAutoMode;
        this.resonance = properties.resonance;
        this.sensitivity = properties.sensitivity;
        this.baseFrequency = properties.baseModulationFrequency;
        this.excursionOctaves = properties.excursionOctaves;
        this.sweep = properties.sweep;

        this.envelopeFollower.activate(true);
    };
    DMAF.AudioNodes.WahWah.prototype = Object.create(Super, {
        name: {
            value: "WahWah"
        },
        activateCallback: {
            value: function (value) {
                this.automode = value;
            }
        },
        automode: {
            get: function () {
                return this._automode;
            },
            set: function (value) {
                this._automode = value;
                if(value) {
                    this.activateNode.connect(this.envelopeFollower.input);
                    this.envelopeFollower.activate(true);
                } else {
                    this.envelopeFollower.activate(false);
                    this.activateNode.disconnect();
                    this.activateNode.connect(this.filterBp);
                }
            }
        },
        sweep: {
            enumerable: true,
            get: function () {
                return this._sweep.value;
            },
            set: function (value) {
                this._sweep = Math.pow(value > 1 ? 1 : value < 0 ? 0 : value, this._sensitivity);
                this.filterBp.frequency.value = this._baseFrequency + this._excursionFrequency * this._sweep;
                this.filterPeaking.frequency.value = this._baseFrequency + this._excursionFrequency * this._sweep;
            }
        },
        baseFrequency: {
            enumerable: true,
            get: function () {
                return this._baseFrequency;
            },
            set: function (value) {
                this._baseFrequency = 50 * Math.pow(10, this.verify("baseFrequency", value) * 2);
                this._excursionFrequency = Math.min(this.sampleRate / 2, this.baseFrequency * Math.pow(2, this._excursionOctaves));
                this.filterBp.frequency.value = this._baseFrequency + this._excursionFrequency * this._sweep;
                this.filterPeaking.frequency.value = this._baseFrequency + this._excursionFrequency * this._sweep;
            }
        },
        excursionOctaves: {
            enumerable: true,
            get: function () {
                return this._excursionOctaves;
            },
            set: function (value) {
                this._excursionOctaves = this.verify("excursionOctaves", value);
                this._excursionFrequency = Math.min(this.sampleRate / 2, this.baseFrequency * Math.pow(2, this._excursionOctaves));
                this.filterBp.frequency.value = this._baseFrequency + this._excursionFrequency * this._sweep;
                this.filterPeaking.frequency.value = this._baseFrequency + this._excursionFrequency * this._sweep;
            }
        },
        sensitivity: {
            enumerable: true,
            get: function () {
                return this._sensitivity;
            },
            set: function (value) {
                this._sensitivity = this.verify("sensitivity", value);
                this._sensitivity = Math.pow(10, this._sensitivity);
            }
        },
        resonance: {
            enumerable: true,
            get: function () {
                return this._resonance;
            },
            set: function (value) {
                this._resonance = this.verify("resonance", value);
                this.filterPeaking.Q = this._resonance;
            }
        },
        init: {
            value: function () {
                var keys = Object.keys(this.defaults),
                    i, ii;
                this.output.gain.value = 5;
                this.filterPeaking.type = 5;
                this.filterBp.type = 2;
                this.filterPeaking.frequency.value = 100;
                this.filterPeaking.gain.value = 20;
                this.filterPeaking.Q.value = 5;
                this.filterBp.frequency.value = 100;
                this.filterBp.Q.value = 1;
                this.sampleRate = DMAF.context.sampleRate;
                for(i = 0, ii = keys.length; i < ii; i++) {
                    this[keys[i]] = this.defaults[keys[i]].value;
                }
            }
        }
    });
});