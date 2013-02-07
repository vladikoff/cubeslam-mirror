dmaf.once("load_synth", function (DMAF) {
    var type = "synth",
        mToF = DMAF.Utils.MIDIToFrequency,
        toMidi = DMAF.Utils.toMIDINote,
        dbToWAV = DMAF.Utils.dbToWAVolume,
        Super = DMAF.InstancePrototype;

    //Move getSampleMap method to DMAF.getAsset
    function Sampler(properties) {
        this.input = DMAF.context.createGainNode();
        this.output = DMAF.context.createGainNode();
        this.Note = getNoteClass.call(this, properties);
    }
    Sampler.prototype = Object.create(Super, {
        init: {
            value: function (properties) {
                routeInternalEffects.apply(this, [properties.output, properties.audioNodes, properties.bus]);
                this._sustain = false;
                this.samples = {
                    meta: Object.create(null),
                    maps: Object.create(null),
                    used: Object.create(null),
                    active: Object.create(null),
                    sustained: []
                };
                for (var i = 0, ii = properties.sampleMapGroups[0].sampleMaps.length; i < ii; i++) {
                    //Need to fix this
                    this.samples.meta[properties.sampleMapGroups[0].sampleMaps[i].name] = properties.sampleMapGroups[0].sampleMaps[i];
                }
                for (var mapName in this.samples.meta) {
                    this.samples.maps[mapName] = DMAF.getAsset("sampleMap", mapName);
                    this.samples.used[mapName] = Object.create(null);
                }
                DMAF.Clock.addFrameListener(this.instanceId, disposeCheck, this);
            }
        },
        numberOfVoices: {
            value: 16
        },
        volume: {
            get: function () {
                return this.output.gain.value;
            },
            set: function (value) {
                this.output.gain.value = DMAF.Utils.dbToWAVolume(value);
            }
        },
        sustain: {
            get: function () {
                return this._sustain;
            },
            set: function (value) {
                if (value) {
                    this._sustain = true;
                } else {
                    this._sustain = false;
                    for (var i = 0, ii = this.samples.sustained.length; i < ii; i++) {
                        this.samples.sustained[i]._noteOff(DMAF.context.currentTime * 1000);
                    }
                }
            }
        },
        filterSustain: {
            get: function () {
                return this._filterSustain;
            },
            set: function (value) {
                this._filterSustain = Math.pow(value, 4);
            }
        },
        controller: {
            value: function (eventProperties) {
                if (message.cc === 64) {
                    this.sustain = this.verify("sustain", message.value);
                }
            }
        },
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                if (!eventProperties) {
                    return;
                }
                if (this[eventProperties.type]) {
                    this[eventProperties.type](actionTime, eventProperties);
                } else {
                    console.log("Sampler does not recognize message ", eventProperties);
                }
            }
        },
        getRange: {
            value: function (midiNote, velocity) {
                var meta = this.samples.meta,
                    maps = this.samples.maps,
                    used = this.samples.used,
                    sampleIndex = 0,
                    possible = [],
                    mapToUse, mapName, ranges, range, highEnd, lowend;

                for (mapName in meta) {
                    if (meta[mapName].velocityLow <= velocity && meta[mapName].velocityHigh >= velocity) {
                        mapToUse = maps[mapName];
                        for (ranges in mapToUse) {
                            range = mapToUse[ranges];
                            if (midiNote >= toMidi(range.low) && midiNote <= toMidi(range.hi)) {
                                possible.push(range);
                            }
                        }
                    }
                }
                if (possible.length !== 1) {
                    if (used[mapName][midiNote] !== undefined) {
                        sampleIndex = (used[mapName][midiNote] + 1) % possible.length;
                    }
                    used[mapName][midiNote] = sampleIndex;
                }
                return possible[sampleIndex];
            }
        },
        noteOn: {
            value: function (actionTime, eventProperties) {
                var active = this.samples.active,
                    midiNote = eventProperties.midiNote,
                    velocity = eventProperties.velocity,
                    duration = eventProperties.duration || eventProperties.endTime,
                    range = this.getRange(midiNote, velocity),
                    note;

                //If not in range..
                if (range && range.sound) { //or sample is not loaded...
                    if (!DMAF.getAsset("buffer", range.sound)) {
                        return;
                    }
                } else {
                    return;
                }
                //Create a new note
                note = new this.Note({
                    parent: this,
                    sampleGain: range.vol,
                    baseNote: range.root,
                    buffer: range.sound,
                    midiNote: midiNote,
                    velocity: velocity
                });
                //Call noteOff for any conflicting notes
                if (active[midiNote]) {
                    if (active[midiNote].length && !this.ignoreNoteOff) {
                        this.noteOff(actionTime, eventProperties);
                    }
                } else {
                    active[midiNote] = []; //If no array in the samples.active object, create one
                }
                if (this.loop && this.ignoreNoteOff) {
                    console.log("Sampler Configuration Error: You cannot use looped samples with ignoreNoteOff.");
                    if (eventProperties.duration) {
                        this.ignoreNoteOff = false;
                    } else {
                        this.loop = false;
                    }
                }
                //Play the note
                note._noteOn(actionTime);

                //Determine noteOff Method
                setNoteOff.apply(this, [note, actionTime, duration]);
            }
        },
        noteOff: {
            value: function (actionTime, eventProperties) {
                var active = this.samples.active,
                    sustained = this.samples.sustained,
                    note = eventProperties.midiNote, i, ii;
                if (!note || this.ignoreNoteOff) {
                    return;
                }
                if (active[note]) {
                    for (i = 0, ii = active[note].length; i < ii; i++) {
                        active[note][i]._noteOff(actionTime || DMAF.context.currentTime * 1000);
                    }
                }
                if (this.sustain) {
                    return;
                }
                for (i = 0, ii = sustained.length; i < ii; i++) {
                    if (sustained[i].midiNote === note) {
                        sustained[i]._noteOff(actionTime || DMAF.context.currentTime * 1000);
                    }
                }
            }
        },
        stopAll: {
            value: function (eventProperties) {
                var active = this.samples.active,
                    sustained = this.samples.sustained,
                    i;
                for (var array in active) {
                    i = active[array].length;
                    while (i--) {
                        active[array][i]._noteOff(DMAF.context.currentTime);
                    }
                    i = sustained.length;
                    while (i--) {
                        sustained[i]._noteOff(DMAF.context.currentTime);
                    }
                }
            }
        }
    });
    //Sampler Private Methods
    function routeInternalEffects(output, effects, bus) {
        if (output) {
            this.input.connect(this.output);
            this.output.connect(output);
        } else {
            var lastNode = this.input;
            this.effects = DMAF.Utils.createEffectsRecursive(lastNode, effects);
            if (this.effects.length > 0) {
                lastNode = this.effects[this.effects.length - 1];
            }
            lastNode.connect(this.output);
            if (!bus || bus === "master") {
                this.output.connect(DMAF.context.master);
            } else {
                var targetBus = DMAF.getInstance("audioRouter", bus);
                if (targetBus) {
                    this.output.connect(targetBus.input);
                } else {
                    this.output.connect(DMAF.context.destination);
                }
            }
        }
    }
    function disposeCheck() {
        var currentTime = DMAF.context.currentTime,
            active = this.samples.active,
            sustained = this.samples.sustained,
            i;
        for (var array in active) {
            i = active[array].length;
            while (i--) {
                if (active[array][i].disposeTime <= currentTime) {
                    active[array].splice(i, 1);
                }
            }
        }
        i = sustained.length;
        while (i--) {
            if (sustained[i].disposeTime <= currentTime) {
                sustained.splice(i, 1);
            }
        }
    }
    function setNoteOff(note, actionTime, duration) {
        var unknownDuration = this._loop && this._sustain,
            defaultDuration = this._loop ? Infinity : note.bufferLength * 1000 - note.ampRelease,
            adjustedDuration = this.ignoreNoteOff ? defaultDuration : duration ? duration : defaultDuration,
            noteOffTime = actionTime + (unknownDuration ? Infinity : adjustedDuration);
        
        if (isFinite(noteOffTime)) {
            note._noteOff(noteOffTime);
        }
        if (this.sustained || !duration) {
            this.samples.sustained.push(note);
            if (this.samples.sustained.length > this.numberOfVoices) {
                this.samples.sustained[0]._noteOff(DMAF.context.currentTime * 1000);
            }
        } else {
            this.samples.active[note.midiNote].push(note);
        }
    }
    function getNoteClass(properties) {
        function Note(properties) {
            //Instantiate Audionodes
            this.bufferSource = DMAF.context.createBufferSource();
            this.amp = DMAF.context.createGainNode();
            this.filter = this.filterOn && DMAF.context.createBiquadFilter();

            //Connect AudioNodes
            this.bufferSource.connect(this.filter || this.amp);
            if (this.filter) {
                this.filter.connect(this.amp);
            }
            this.amp.connect(this.output);
            //Set Properties
            this.parent = properties.parent;
            this.midiNote = properties.midiNote;
            this.bufferSource.gain.value = properties.sampleGain !== undefined ? dbToWAV(parseInt(properties.sampleGain, 10)) : 1;
            this.bufferSource.playbackRate.value = mToF(this.midiNote) / mToF(toMidi(properties.baseNote));
            this.bufferSource.buffer = DMAF.getAsset("buffer", properties.buffer);
            this.bufferLength = this.bufferSource.buffer.length / DMAF.context.sampleRate;
            this.velocity = Math.pow(properties.velocity / 127, 1.2);
            this.bufferSource.loop = this.parent.loop;
            if (this.filterOn) {
                this.filter.Q.value = this.filterQ;
                this.filter.gain = this.filterGain;
            }
        }
        Note.prototype = Object.create(this);
        Note.prototype.output = this.input;
        Note.prototype._noteOn = NoteMixins.noteOn;
        Note.prototype._noteOff = NoteMixins.noteOff;
        return Note;
    }
    var NoteMixins = {
        noteOn: function noteOn (noteOnTime) {
            //Get Amp Envelope
            var ampAttackTime = noteOnTime + this.ampAttack,
                ampDecayTime = ampAttackTime + this.ampDecay,
                ampPeak = 1 - this.ampVelocityRatio + this.velocity * this.ampVelocityRatio,
                ampSustain = Math.pow((this.ampSustain * ampPeak), 2);
    
            this.noteOnTime = noteOnTime;
            this.ampPeakValue = ampPeak;
            this.ampSustainValue = ampSustain;

            //Set Amp Envelope
            this.amp.gain.setValueAtTime(0, noteOnTime / 1000); //initial zero value
            this.amp.gain.linearRampToValueAtTime(ampPeak, ampAttackTime / 1000); //attack
            this.amp.gain.linearRampToValueAtTime(ampSustain, ampDecayTime / 1000); //decay
            //If Filter, get Filter Envelope
            if (this.filterOn) {
                var filterAttackTime = noteOnTime + this.filterAttack,
                    filterDecayTime = filterAttackTime + this.filterDecay,
                    filterVelocity = 1 - this.filterVelocityRatio + this.velocity * this.filterVelocityRatio,
                    adsrPeakFrequency = this.filterADSRAmount * filterVelocity,
                    totalPeakFrequency = this.filterFrequency + adsrPeakFrequency,
                    sustainFrequency = this.filterFrequency + (this.filterSustain * adsrPeakFrequency);

                totalPeakFrequency = mToF((totalPeakFrequency * 12) + this.midiNote);
                sustainFrequency = mToF((sustainFrequency * 12) + this.midiNote);
                totalPeakFrequency = totalPeakFrequency < 20 ? 20 : totalPeakFrequency > 20000 ? 20000 : totalPeakFrequency;
                sustainFrequency = sustainFrequency < 20 ? 20 : sustainFrequency > 20000 ? 20000 : sustainFrequency;

                //Set Filter Envelope
                this.filterFrequency = mToF((this.filterFrequency * 12) + this.midiNote);
                this.filter.frequency.setValueAtTime(this.filterFrequency, noteOnTime / 1000); //Init Value
                this.filter.frequency.linearRampToValueAtTime(totalPeakFrequency, filterAttackTime / 1000); //attack
                this.filter.frequency.linearRampToValueAtTime(sustainFrequency, filterDecayTime / 1000); //decay
            }

            //Set noteOnTime for noteOff and start the sample playing
            this.bufferSource.noteOn(this.noteOnTime / 1000);
        },
        noteOff: function noteOff (noteOffTime, isBeforeBufferLength) {
            var ampReleaseTime, filterReleaseTime, oscNoteOffTime;
            ampReleaseTime = noteOffTime + this.ampRelease;
            filterReleaseTime = noteOffTime + this.filterRelease;
            this.amp.gain.cancelScheduledValues(noteOffTime / 1000);
            this.amp.gain.setValueAtTime(this.ampSustainValue, noteOffTime / 1000);
            this.amp.gain.linearRampToValueAtTime(0, ampReleaseTime / 1000);

            //Automate Filter release
            if (this.filter) {
                this.filter.frequency.cancelScheduledValues(noteOffTime / 1000);
                this.filter.frequency.setValueAtTime(this.filter.frequency.value, noteOffTime / 1000);
                this.filter.frequency.linearRampToValueAtTime(this.filterFrequency, filterReleaseTime / 1000);
            }

            //Set bufferSource noteOffTime
            this.bufferSource.noteOff(ampReleaseTime / 1000);
            //Set disposeTime
            this.disposeTime = ampReleaseTime / 1000;
            this.noteOffSent = true;
        }
    };
    DMAF.registerInstance(type, "Sampler", Sampler);
});