dmaf.once("load_midiProcessor", function (DMAF) {
    var type = "midiProcessor",
        scales = {
            OFF: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            major: [0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1],
            harmonicMinor: [0, 1, 0, 0, -1, 0, 1, 0, 0, -1, 1, 0],
            naturalMinor: [0, -1, 0, 0, -1, 0, -1, 0, 0, -1, 0, -1]
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

    function MakeNote () {}
    MakeNote.prototype = Object.create(DMAF.InstancePrototype, {
        init: {
            value: function () {
                for (var i = 0, ii = this.noteMaps.length; i < ii; i++) {
                    this.noteMaps[i].midiNote = DMAF.Utils.toMIDINote(this.noteMaps[i].note);
                }
            }
        },
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                var note;
                for (var i = 0, ii = this.noteMaps.length; i < ii; i++) {
                    if (trigger === this.noteMaps[i].triggerIn) {
                        note = {
                            type: "noteOn",
                            midiNote: this.noteMaps[i].midiNote,
                            velocity: this.noteMaps[i].velocity,
                            duraiton: this.noteMaps[i].duration
                        };
                        DMAF.ActionManager.onEvent(this.noteMaps[i].triggerOut, actionTime, note);
                    }
                }
            }
        }
    });
    DMAF.registerInstance(type, "MakeNote", MakeNote);
});