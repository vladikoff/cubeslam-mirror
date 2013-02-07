dmaf.once("load_sound", function (DMAF) {
    var type = "sound";

    var ctm = DMAF.Clock,
        counter = 0,
        Super = Object.create(DMAF.InstancePrototype, {
            init: {
                value: function (properties)  {
                    this.pendingPlays = [];
                    this.pendingStops = [];
                    this.sounds = [];
                    this.previousActionTime = -Infinity;
                    this.playing = false;
                    if (!properties.bus || properties.bus === "master") {
                        this.targetBus = DMAF.context.destination;
                    } else {
                        var bus = DMAF.getInstance("audioRouter", properties.bus);
                        this.targetBus = bus ? bus.input : DMAF.context.destination;
                    }
                }
            },
            dbToWAV: {
                value: DMAF.Utils.dbToWAVolume
            },
            checkIfPlaying: {
                value: function () {
                    var sound, i;
                    while ((sound = this.sounds[i++])) {
                        if(sound.buffer.playbackState === sound.buffer.PLAYING_STATE) {
                            return this.playing = true;
                        }
                    }
                    return this.playing = false;
                }
            },
            dispose: {
                value: function (id) {
                    var s = this.sounds,
                        i = s.length,
                        playing;
                    while (i--) {
                        if(s[i].id === id) {
                            s.splice(i, 1);
                        }
                    }
                    this.checkIfPlaying();
                }
            },
            play: {
                value: function (actionTime) {
                    if (this.reTrig > -1) {
                        if (actionTime - this.previousActionTime < this.reTrig) {
                            console.log("ReTrig settings prevented", this.instanceId, "from playing");
                            return;
                        }
                    }
                    if (this.playing && this.loop > -1) {
                        console.log("Sound", this.instanceId, "is already looping.");
                        return;
                    }
                    //Drop pending actions
                    ctm.dropPendingArray(this.pendingPlays);
                    ctm.dropPendingArray(this.pendingStops);

                    //Keep Reference to last successful play action
                    this.previousActionTime = actionTime;

                    if (this.timingCorrection === "SYNC") {
                        offset = Math.abs(actionTime - (DMAF.context.currentTime * 1000));
                    } else {
                        offset = 0;
                    }
                    //Schedule the action
                    ctm.checkFunctionTime(actionTime, this.proceedPlay, this.pendingPlays, this, actionTime, offset);
                }
            },
            proceedPlay: {
                value: function (actionTime, offset) {
                    var buffer = DMAF.getAsset("buffer", this.getSoundFile()),
                        sound,
                        loopLength,
                        disposeTime,
                        soundOverTime,
                        actionTimeInSeconds = actionTime / 1000;

                    if (!buffer) {
                        console.log("GenericPlay: Buffer is loading or missing. Check soundFile property.");
                        return;
                    }
                    sound = DMAF.context.createBufferSource();
                    sound.buffer = buffer;
                    sound.gain.value = this.waVolume;
                    sound.connect(this.targetBus);
                    if (this.loop > -1) {
                        sound.loop = true;
                    }
                    sound.id = counter++;
                    if (this.reTrig !== -1 && this.playing) {
                        console.log("Stopping sound because of reTrig settings.");
                        this.stop();
                    }

                    soundOverTime = actionTime + sound.buffer.duration * 1000; //ms
                    if (this.returnEvent) {
                        ctm.checkFunctionTime(soundOverTime, DMAF.ActionManager.onEvent, [],
                            DMAF.ActionManager, this.returnEvent, soundOverTime + this.returnEventTime);
                    }
                    if (offset > 0) {
                        if (actionTimeInSeconds < 0) {
                            actionTimeInSeconds = 0;
                        }
                        disposeTime = actionTimeInSeconds + (sound.buffer.duration - (offset / 1000));
                        ctm.checkFunctionTime(disposeTime, this.dispose, [], this, sound.id);
                        sound.noteGrainOn(actionTimeInSeconds, offset / 1000, disposeTime);
                    } else {
                        ctm.checkFunctionTime(soundOverTime, this.dispose, [], this, sound.id);
                        switch (this.loop) {
                            case -1:
                                ctm.checkFunctionTime(soundOverTime, this.dispose, [], this, sound.id);
                                sound.noteOn(actionTimeInSeconds);
                                break;
                            case 0:
                                sound.noteOn(actionTimeInSeconds);
                                break;
                            case undefined:
                                sound.noteOn(actionTimeInSeconds);
                                break;
                            default:
                                sound.noteGrainOn(actionTimeInSeconds, 0, this.loop / 1000);
                        }
                    }
                    this.sounds.push(sound);
                    this.playing = true;
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
                    var i = this.sounds.length;
                    while(i--) {
                        this.sounds[i].noteOff(0);
                    }
                    this.playing = false;
                    this.sounds.length = 0;
                }
            },
            verify: {
                value: DMAF.Utils.verify
            },
            volume: {
                get: function () {
                    return this._volume;
                },
                set: function (value) {
                    this._volume = value;
                    this.waVolume = this.dbToWAV(this._volume);
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

