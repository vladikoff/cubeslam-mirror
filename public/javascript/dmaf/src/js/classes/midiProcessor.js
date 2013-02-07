dmaf.once("load_midiProcessor", function (DMAF) {
    var type = "midiProcessor",
        scales = {
            OFF: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            major: [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1, 0],
            harmonicMinor: [0, 1, 0, 0, -1, 0, 1, 0, 0, -1, 1, 0],
            naturalMinor: [0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, -1],
            majorPentatonic: [0, 1, 0, 1, 0, -1, 1, 0, 1, 0, -1, 1],
            minorPentatonic: [0, -1, 1, 0, -1, 0, 1, 0, -1, 1, 0, -1],
            dorian: [0, 1, 0, 0, -1, 0, 1, 0, 1, 0, 0, -1],
            phrygian: [0, 0, -1, 0, -1, 0, 1, 0, 0, -1, 0, -1],
            lydian: [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0],
            mixolydian: [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, -1],
            locrian: [0, 0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1],
            doubleHarmonic: [0, 0, -1, 1, 0, 0, 1, 0, 0, -1, 1, 0],
            halfDim: [0, 1, 0, 0, -1, 0, 0, -1, 0, -1, 0, -1]
        },
        roots = {
            "C": 0,
            "C#": 1,
            "D": 2,
            "D#": 3,
            "E": 4,
            "F": 5,
            "F#": 6,
            "G": 7,
            "G#": 8,
            "A": 9,
            "A#": 10,
            "B": 11
        };
    /*
    Transpose: Transpose incoming midi note by value in midi notes.
    Quantize: Shift notes forward to next specified subdivision.
    Dynamic: Adjust velocity of note by specified amount.
    Scale: Quantize incoming midi notes to a specified scale.
    Key: Specify the root of the scale.
    CustomScale: if present, quantize to this scale
    */
    function MidiProcessor () {}
    MidiProcessor.prototype = Object.create(DMAF.InstancePrototype, {
        updateValues: {
            value: ["transpose", "scale", "root"]
        },
        scale: {
            get: function () {
                return this._scale;
            },
            set: function (value) {
                this._scale = scales[value];
            }
        },
        root: {
            get: function () {
                return this._root;
            },
            set: function (value) {
                this._root = roots[value];
            }
        },
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                if (!eventProperties || !eventProperties.midiNote) {
                    console.log("no eventProperties");
                    return; //If there is no midi data, return;
                }
                if (this.transpose) {
                    this.transpose = parseInt(this.transpose, 10);
                    eventProperties.midiNote += this.transpose;
                }
                if (this.scale) {
                    this.quantizeToScale(eventProperties);
                }
            }
        },
        quantizeToScale: {
            value: function (eventProperties) {
                var pitchClass, baseAdjust;
                if (eventProperties.midiNote) {
                    pitchClass = eventProperties.midiNote % 12;
                    pitchClass -= this._root;
                    if (pitchClass < 0) {
                        pitchClass = 12 + pitchClass;
                    }
                    eventProperties.midiNote += this.scale[pitchClass];
                }
                return eventProperties;
            }
        }
    });
    DMAF.registerInstance(type, "MidiProcessor", MidiProcessor);
});