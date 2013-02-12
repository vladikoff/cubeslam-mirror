dmaf.once("load_player", function(DMAF) {
    var type = "player",
        Super = DMAF.InstancePrototype,
        firstTime = true;

    function BeatPatternPlayer(properties) {
        this.state = this.STOPPED;
        this.pendingPatterns = [];
        this.activePatterns = [];
        this.pendingEvents = [];
        this.tempo = 120;
        this.songPosition = new DMAF.Processor.BeatPosition(0, 16, 16);
        this.currentPattern = new DMAF.Processor.BeatPatternInstance(this, {
            beatPattern: new DMAF.Processor.BeatPattern('master', 1),
            channel: "master",
            addAtSongPosition: new DMAF.Processor.BeatPosition(1, 1, 16),
            patternStartPosition: 1,
            clearPending: true,
            replaceActive: true,
            setAsCurrent: true,
            loop: true,
            loopLength: 16,
            clearPosition: new DMAF.Processor.BeatPosition(1, 1, 16)
        });
    }
    var a = true;
    BeatPatternPlayer.prototype = Object.create(Super, {
        STOPPED: {
            value: 0
        },
        RUNNING: {
            value: 1
        },
        tempo: {
            get: function() {
                return this._tempo;
            },
            set: function(value) {
                this._tempo = value;
                this.beatLength = (60 / value) * 250;
                //TODO: Fix this now that DMAF doesn't have internal events.
                DMAF.dispatch("tempo_" + this.instanceId, this._tempo);
            }
        },
        onAction: {
            value: function(trigger, actionTime, eventProperties, actionProperties) {
                if(actionProperties.flowItems) {
                    var flow = actionProperties.flowItems,
                        flowItem, dyn;

                    for(var i = 0, ii = flow.length; i < ii; i++) {
                        flowItem = Object.create(flow[i]);
                        if(flowItem.patternId === "trigger") {
                            flowItem.patternId = trigger;
                        }
                        if(flowItem._dynamicValues) {
                            for(var j = 0, jj = flowItem._dynamicValues.length; j < jj; j++) {
                                dyn = flowItem._dynamicValues[j];
                                flowItem[dyn.key] = DMAF.getInstanceProperty(dyn.string);
                            }
                        }
                        switch(flowItem.id) {
                        case "start":
                            this.start(flowItem, actionTime, eventProperties);
                            break;
                        case "add":
                            DMAF.Clock.checkFunctionTime(actionTime, this.addPattern, [], this, flowItem);
                            break;
                        case "stop":
                            this.stop(flowItem);
                            break;
                        case "beatEvent":
                            this.beatEvent(flowItem);
                        }
                    }
                }
            }
        },
        addPattern: {
            value: function(properties) {
                if(this.state === this.RUNNING) {
                    properties.beatPattern = DMAF.getAsset("beatPattern", properties.patternId);
                    properties.addAtSongPosition = this.getSongPosition(properties.songPosition);
                    properties.startPatternAtBeat = this.getStartAtBeat(properties.patternPosition);
                    properties.clearPosition = this.getSongPosition(properties.clearPosition);
                    var beatPatternInstance = new DMAF.Processor.BeatPatternInstance(this, properties);
                    if(properties.clearPending) {
                        if(properties.channel === "main") {
                            this.pendingPatterns.length = 0;
                        } else {
                            var i = this.pendingPatterns.length;
                            while(i--) {
                                if(this.pendingPatterns[i].channel === properties.channel) {
                                    this.pendingPatterns.splice(i, 1);
                                }
                            }
                        }
                    }
                    if(!beatPatternInstance.ERROR) {
                        this.pendingPatterns.push(beatPatternInstance);
                    }
                } else {
                    console.log("BeatPatternPlayer: Cannot add pattern while player is not running.", properties.patternId);
                }
            }
        },
        checkBeat: {
            value: function() {
                var currentTime = DMAF.context.currentTime * 1000;

                while(currentTime - this.nextBeatTime - DMAF.preListen > this.beatLength) {
                    this.skipBeat(this.nextBeatTime);
                }
                while(currentTime >= this.nextBeatTime - DMAF.preListen) {
                    this.updateBeat(this.nextBeatTime);
                }
            }
        },
        skipBeat: {
            value: function(eventTime) {
                this.songPosition.gotoNextBeat();
                this.nextBeatTime = eventTime + this.beatLength;
                for(var i = 0, ii = this.activePatterns.length; i < ii; i++) {
                    this.activePatterns[i].gotoNextBeat();
                }
                this.updateActivePatterns();
            }
        },
        updateBeat: {
            value: function(eventTime) {
                this.nextBeatTime = eventTime + this.beatLength - checkDifference();
                this.songPosition.gotoNextBeat();
                for(var i = 0, ii = this.activePatterns.length; i < ii; i++) {
                    this.activePatterns[i].gotoNextBeat();
                }
                this.updateActivePatterns();
                for(i = 0, ii = this.activePatterns.length; i < ii; i++) {
                    this.activePatterns[i].executeEvents(eventTime, this.beatLength);
                }
            }
        },
        updateActivePatterns: {
            value: function() {
                var instanceToActivate, removePosition, clearPosition, addPosition, j, jj;
                for (var i = 0; i < this.pendingPatterns.length; i++) {
                    addPosition = this.pendingPatterns[i].addAtSongPosition;
                    if(addPosition.bar === this.songPosition.bar && addPosition.beat === this.songPosition.beat) {
                        instanceToActivate = this.pendingPatterns[i];
                        this.pendingPatterns.splice(i--, 1);
                        if(instanceToActivate.replaceActive) {
                            for(j = 0, jj = this.activePatterns.length; j < jj; j++) {
                                if(instanceToActivate.channel === "main" || instanceToActivate.channel === this.activePatterns[j].channel) {
                                    this.activePatterns[j].removeAtSongPosition = instanceToActivate.clearPosition;
                                }
                            }
                        }
                        if(instanceToActivate.setAsCurrent) {
                            this.currentPattern = instanceToActivate;
                        }
                        this.activePatterns.push(instanceToActivate);
                    }
                }
                i = this.activePatterns.length;
                while(i--) {
                    removePosition = this.activePatterns[i].removeAtSongPosition;
                    if(removePosition.bar === this.songPosition.bar && removePosition.beat === this.songPosition.beat) {
                        this.activePatterns.splice(i, 1);
                    } else if(removePosition.bar < this.songPosition.bar) {
                        this.activePatterns.splice(i, 1);
                    }
                }
            }
        },
        start: {
            value: function(flowItem, actionTime, eventProperties) {
                if(this.state === this.RUNNING) {
                    console.log("ALREADY RUNNING!");
                    return;
                }
                var tempo, songPosition;
                if(eventProperties) {
                    tempo = eventProperties.tempo;
                    songPosition = eventProperties.songPosition || eventProperties.position;
                }
                tempo = tempo ? tempo : flowItem.tempo;
                songPosition = songPosition ? songPosition : {
                    bar: 0,
                    beat: 16,
                    beatsPerBar: 16
                };
                if(actionTime < DMAF.context.currentTime * 1000) {
                    //console.log("actionTime recieved in beatPatternPlayer was before currentTime.");
                    //console.log("currentTime", DMAF.context.currentTime * 1000);
                    //console.log("actionTime", actionTime);
                    actionTime = DMAF.context.currentTime * 1000;
                }
                actionTime = actionTime || DMAF.context.currentTime * 1000;

                this.tempo = tempo;
                this.nextBeatTime = actionTime;
                this.beatsPerBar = songPosition.beatsPerBar;
                this.songPosition = new DMAF.Processor.BeatPosition(songPosition.bar, songPosition.beat, songPosition.beatsPerBar);
                DMAF.Clock.addFrameListener("checkBeat", this.checkBeat, this);
                this.state = this.RUNNING;
            }
        },
        stop: {
            value: function(flowItem) {
                var position = this.getSongPosition(flowItem.songPosition).getInBeats(),
                    current = this.songPosition.getInBeats(),
                    time = (position - current) * this.beatLength;
                time += DMAF.context.currentTime * 1000;
                if(time < 0) {
                    time = 0;
                }
                DMAF.Clock.checkFunctionTime(time, this.proceedStop, [], this, flowItem);
            }
        },
        proceedStop: {
            value: function(flowItem) {
                this.state = this.STOPPED;
                this.pendingPatterns.length = 0;
                this.activePatterns.length = 0;
                this.songPosition = new DMAF.Processor.BeatPosition(0, this.beatsPerBar, this.beatsPerBar);
                this.currentPattern = new DMAF.Processor.BeatPatternInstance(this, {
                    beatPattern: new DMAF.Processor.BeatPattern("MASTER", 1),
                    channel: "MASTER",
                    addAtSongPosition: new DMAF.Processor.BeatPosition(1, 1, 16),
                    patternStartPosition: 1,
                    clearPending: true,
                    replaceActive: true,
                    setAsCurrent: true,
                    loop: true,
                    loopLength: 16,
                    clearPosition: new DMAF.Processor.BeatPosition(1, 1, 16)
                });
                DMAF.Clock.removeFrameListener("checkBeat");
                if(flowItem.returnEvent) {
                    DMAF.ActionManager.onEvent(flowItem.returnEvent);
                }
            }
        },
        beatEvent: {
            value: function(flowItem) {
                var position = this.getSongPosition(flowItem.songPosition).getInBeats(),
                    current = this.songPosition.getInBeats(),
                    time = (position - current) * this.beatLength;
                time += DMAF.context.currentTime * 1000;
                switch(flowItem.output) {
                case "onEvent":
                    DMAF.Clock.checkFunctionTime(
                    time, DMAF.ActionManager.onEvent, this.pendingEvents, DMAF.ActionManager, flowItem.returnEvent);
                    break;
                case "dispatch":
                    DMAF.Clock.checkFunctionTime(
                    time, DMAF.dispatch, this.pendingEvents, DMAF, flowItem.returnEvent);
                    break;
                }
            }
        },
        getSongPosition: {
            value: function(string) {
                var mode = string,
                    offsetBeat = 0,
                    offsetBar = 0,
                    chain, position = new DMAF.Processor.BeatPosition(this.songPosition.bar, this.songPosition.beat, this.beatsPerBar);
                if(/\+/.test(mode)) {
                    chain = mode.split("+");
                    mode = chain[0];
                    chain = chain[1].split(".");
                    offsetBar = parseInt(chain[0], 10) || 0;
                    offsetBeat = parseInt(chain[1], 10) || 0;
                }
                switch(mode) {
                case "NEXT_BEAT":
                    position.addOffset({
                        bar: 0,
                        beat: 1
                    });
                    break;
                case "NEXT_BAR":
                    position.beat = 1;
                    position.bar++;
                    break;
                case "ASAP":
                    //do it now!
                    return position;
                default:
                    console.log("BeatPatternPlayer getSongPosition: Unrecognized songPosition ", mode);
                }
                position.bar += offsetBar;
                position.beat += offsetBeat;
                return position;
            }
        },
        getStartAtBeat: {
            value: function(string) {
                var mode = string,
                    beat = this.currentPattern.currentBeat || 1;
                if(!mode) {
                    return;
                }
                switch(mode) {
                case "FIRST_BEAT":
                    beat = 1;
                    break;
                case "SYNC":
                    beat++;
                    break;
                default:
                    console.log("BeatPatternPlayer: Unrecognized patternPosition " + mode);
                }
                return beat;
            }
        }
    });
    DMAF.registerInstance(type, "BeatPatternPlayer", BeatPatternPlayer);

    function checkDifference() {
        var jsTime = new Date().getTime(),
            contextTime = DMAF.context.currentTime * 1000,
            difference, change;
        if(firstTime) {
            checkDifference.lastDifference = difference;
            firstTime = false;
        }
        difference = jsTime - contextTime;
        change = difference - checkDifference.lastDifference;
        if(Math.abs(change) > 5) {
            console.log("DMAF: Adjusting next beat Time. Difference was " + change + "ms");
            checkDifference.lastDifference = difference;
            return change;
        } else {
            return 0;
        }
    }

    function TimePatternPlayer(properties) {
        this.activePatterns = [];
    }
    TimePatternPlayer.prototype = Object.create(Super, {
        init: {
            value: function() {
                DMAF.Clock.addFrameListener(this.instanceId, this.checkPatterns, this);
            }
        },
        onAction: {
            value: function(trigger, actionTime, eventProperties, actionProperties) {
                var chain = trigger.split("."),
                    action = chain[1].toLowerCase(),
                    patternId = chain[0];
                if(this[action]) {
                    this[action](patternId, actionTime);
                }
            }
        },
        start: {
            value: function(patternId, actionTime) {
                var pattern = DMAF.getAsset("timePattern", patternId);
                if(pattern) {
                    if(this.activePatterns.indexOf(pattern) === -1) {
                        this.activePatterns.push(pattern);
                    }
                    pattern.startTime = actionTime;
                } else {
                    console.log("No time pattern with id ", patternId, "exists.");
                }
            }
        },
        stop: {
            value: function(patternId, actionTime) {
                var pattern = DMAF.getAsset("timePattern", patternId),
                    index;
                if(pattern) {
                    if(this.behavior === "DEFAULT") {
                        pattern.startTime = -1;
                    }
                    index = this.activePatterns.indexOf(pattern);
                    if(index !== -1) {
                        this.activePatterns.splice(index, 1);
                    }
                } else {
                    console.log("No time pattern with id ", patternId, "exists.");
                }
            }
        },
        checkPatterns: {
            value: function() {
                for(var i = 0, ii = this.activePatterns.length; i < ii; i++) {
                    this.activePatterns[i].executeEvents(this.behavior);
                }
            }
        }
    });
    DMAF.registerInstance(type, "TimePatternPlayer", TimePatternPlayer);
});