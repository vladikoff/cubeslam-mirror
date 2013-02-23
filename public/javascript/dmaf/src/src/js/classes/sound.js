dmaf.once("load_sound", function (DMAF) {
    var type = "sound", UID = 0;

    var ctm = DMAF.Clock,
        Super = Object.create(DMAF.InstancePrototype, {
            init: {
                value: function (properties)  {
                    this.pendingPlays = [];
                    this.pendingStops = [];
                    this.pendingEvents = [];
                    this.sounds = [];
                    this.playing = false;
                    this.previousActionTime = 0;
                    if (!properties.bus || properties.bus === "master") {
                        this.targetBus = DMAF.context.destination;
                    } else {
                        var bus = DMAF.getInstance("audioRouter", properties.bus);
                        this.targetBus = bus ? bus.input : DMAF.context.destination;
                    }
                }
            },
            clearAll: {
                value: function () {
                    var s = this.sounds,
                        i = s.length;
                    while (i--) {
                        this.sounds[i].noteOff(0);
                    }
                    this.sounds.length = 0;
                    this.playing = false;
                }
            },
            createSound: {
                value: function () {
                    var sound = DMAF.context.createBufferSource(),
                        buffer = DMAF.getAsset("buffer", this.getSoundFile());
                    if (!buffer) {
                        console.log("GenericPlay: Buffer is missing. Check soundFile property.");
                        return {buffer: {duration: -1}};
                    }
                    sound.id = UID++;
                    sound.buffer = buffer;
                    sound.gain.value = this.waVolume;
                    sound.connect(this.targetBus);
                    sound.loop = false;
                    return sound;
                }
            },
            dispose: {
                value: function (id) {
                    var i = this.sounds.length;
                    while (i--) if (this.sounds[i].id === id) {
                        this.sounds.splice(i, 1);
                    }
                    this.playing = !!this.sounds.length;
                }
            },
            play: {
                value: function (actionTime) {
                    ctm.dropPendingArray(this.pendingStops);
                    if (this.playing) {
                        if (this.reTrig > -1) {
                            ctm.dropPendingArray(this.pendingPlays);
                            ctm.dropPendingArray(this.pendingEvents);
                        }
                        if (this.reTrig === 0 || this.timingCorrection === "RESYNC") {
                            ctm.checkFunctionTime(actionTime, this.proceedPlay, this.pendingPlays, this, actionTime);
                        } else if (this.reTrig > 0) {
                            if (actionTime - this.previousActionTime > this.reTrig) {
                                this.previousActionTime = actionTime;
                                ctm.checkFunctionTime(actionTime, this.proceedPlay, this.pendingPlays, this, actionTime);
                            }
                        }
                    } else {
                        this.previousActionTime = actionTime;
                        ctm.checkFunctionTime(actionTime, this.proceedPlay, this.pendingPlays, this, actionTime);
                    }
                }
            },
            proceedPlay: {
                value: function (actionTime) {
                    console.log("Playing", this.instanceId);
                    var sound = this.createSound(),
                        preDelay = Math.abs(actionTime - DMAF.context.currentTime * 1000),
                        bufferLength = sound.buffer.duration * 1000,
                        duration = bufferLength - preDelay,
                        loopTime = actionTime + (this.loop || bufferLength);
                    switch (this.timingCorrection) {
                        case "PLAY":
                            sound.noteOn(actionTime / 1000);
                            break;
                        case "SYNC":
                            if (duration <= 0) return; //The sound must have a duration
                            sound.noteGrainOn(Math.max(0, actionTime / 1000), preDelay / 1000, duration / 1000);
                            break;
                        case "RESYNC":
                            if (duration <= 0) return; //The sound must have a duration
                            this.clearAll();
                            sound.noteGrainOn(Math.max(0, actionTime / 1000), preDelay / 1000, duration / 1000);
                    }
                    if (this.returnEvent) {
                        ctm.checkFunctionTime(
                            actionTime + bufferLength + this.returnEventTime,
                            DMAF.ActionManager.onEvent,
                            this.pendingEvents,
                            DMAF.ActionManager,
                            this.returnEvent,
                            actionTime + bufferLength + this.returnEventTime
                        );
                    }

                    if (this.loop > -1) {
                        ctm.checkFunctionTime(loopTime, this.play, this.pendingPlays, this, loopTime);
                        ctm.checkFunctionTime(loopTime, this.dispose, [], this, sound.id);
                        sound.noteOff((actionTime / 1000) + sound.buffer.duration);
                    } else {
                        ctm.checkFunctionTime(actionTime + bufferLength, this.dispose, [], this, sound.id);
                    }
                    this.playing = true;
                    this.sounds.push(sound);
                }
            },
            stop: {
                value: function (actionTime) {
                    ctm.dropPendingArray(this.pendingPlays);
                    ctm.checkFunctionTime(actionTime, this.proceedStop, this.pendingStops, this);
                }
            },
            proceedStop: {
                value: function () {
                    console.log("Stopping ", this.instanceId);
                    var i = this.sounds.length;
                    this.clearAll();
                    DMAF.sound[this.id].removeInstance(this.instanceId);
                }
            },
            verify: {
                value: DMAF.Utils.verify
            },
            volume: {
                get: function () {
                    if (this.sounds.length) {
                        return this.sounds[this.sounds.length - 1].gain;
                    } else return this._volume;
                },
                set: function (value) {
                    this._volume = value;
                    this.waVolume = DMAF.Utils.dbToWAVolume(this._volume);
                }
            },
            onAction: {
                value: function (trigger, actionTime, eventProperties, actionProperties) {
                    if (this.soundFile === "multi") {
                        this.soundFile = trigger;
                    }
                    this.play(actionTime);
                }
            }
        });

    function GenericPlay () {}
    GenericPlay.prototype = Object.create(Super, {
        getSoundFile: {
            value: function () {
                return this.soundFile;
            }
        }
    });
    DMAF.registerInstance(type, "GenericPlay", GenericPlay);

    function StepPlay (properties) {
        this.iterator = new DMAF.Iterator(properties.soundFiles, properties.generator);
    }
    StepPlay.prototype = Object.create(Super, {
        getSoundFile: {
            value: function () {
                return this.iterator.getNext();
            }
        }
    });
    DMAF.registerInstance(type, "StepPlay", StepPlay);

    function SoundStop () {}
    SoundStop.prototype = Object.create(DMAF.InstancePrototype, {
        init: {
            value: function (properties) {
                this.onAction = (this.targets[0] === "multi") ? multiStop : listStop;
            }
        }
    });
    function multiStop (trigger, actionTime, eventProperties, actionProperties) {
        if (actionTime < DMAF.context.currentTime) {
            actionTime = DMAF.context.currentTime + this.delay;
        }
        var instanceId = trigger.replace(this.multiSuffix, ""),
            instance = DMAF.getInstance("sound", instanceId);

        if (instance) {
            instance.stop(actionTime);
        }
    }
    function listStop (trigger, actionTime, eventProperties, actionProperties) {
        var instance;
        if (actionTime < DMAF.context.currentTime * 1000) {
            actionTime = DMAF.context.currentTime * 1000 + this.delay;
        }
        for (var i = 0, ii = this.targets.length; i < ii; i++) {
            instance = DMAF.getInstance("sound", this.targets[i]);
            if (instance) {
                instance.stop(actionTime);
            }
        }
    }
    DMAF.registerInstance(type, "SoundStop", SoundStop, true);
});

