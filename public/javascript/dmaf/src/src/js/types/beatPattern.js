dmaf.once("load_beatPattern", function (DMAF) {
    DMAF.Processor = {};
    DMAF.Processor.TimePattern = function (patternId, events) {
        this.patternId = patternId;
        this.events = events;
        this.startTime = -1;
        this.lastExecutedEventTime = -1;
    };
    DMAF.Processor.TimePattern.prototype = {
        executeEvents: function (behavior) {
            var currentRelativeTime = DMAF.context.currentTime * 1000 - this.startTime,
                lastEventTime = -1;
            switch (behavior) {
                case "LINEAR":
                    this.executeLinear(currentRelativeTime, lastEventTime);
                    break;
                case "DEFAULT":
                    this.executeDefault(currentRelativeTime, lastEventTime);
                    break;
                default:
                    console.log("Invalid behavior type for TimePattern", this.behavior);
            }
        },
        executeLinear: function (currentRelativeTime, lastEventTime) {
            var i, ii;
            for (i = 0, ii = this.events.length; i < ii; i++) {
                if (this.events[i].absoluteTime > this.lastExecutedEventTime) {
                    if (currentRelativeTime > this.events[i].absoluteTime - DMAF.preListen) {
                        DMAF.ActionManager.onEvent(this.events[i].trigger, this.startTime +
                                this.events[i].absoluteTime, this.events[i]);
                        this.lastExecutedEventTime = this.events[i].absoluteTime;
                    }
                }
            }
        },
        executeDefault: function (currentRelativeTime, lastEventTime) {
            var i, ii;
            if (this.lastExecutedEventTime === -1) {
                for(i = 0, ii = this.events.length; i < ii; i++) {
                    if (currentRelativeTime > this.events[i].absoluteTime - DMAF.preListen) {
                        DMAF.ActionManager.onEvent(this.events[i].trigger, this.startTime +
                            this.events[i].absoluteTime, this.events[i]);
                        lastEventTime = this.events[i].absoluteTime;
                    }
                }
                this.lastExecutedEventTime = lastEventTime;
            } else {
                this.executeLinear(currentRelativeTime, lastEventTime);
            }
        }
    };
    DMAF.Processor.BeatPatternInstance = function (player, properties) {
        if (!properties.beatPattern) {
            console.error("Found no BeatPattern for channel", properties.channel, ". Please check MIDI file.");
            this.ERROR = true;
            return;
        }
        this.addAtSongPosition = properties.addAtSongPosition;
        this.currentBeat = properties.startPatternAtBeat;
        this.replaceActive = properties.replaceActive;
        this.clearPosition = properties.clearPosition;
        this.setAsCurrent = properties.setAsCurrent;
        this.beatPattern = properties.beatPattern;
        this.patternId = properties.patternId;
        this.channel = properties.channel;
        this.loop = properties.loop;
        this.player = player;

        if (this.loop) {
            if (properties.loopLength) {
                this.loopLength = properties.loopLength;
                this.removeAtSongPosition = new DMAF.Processor.BeatPosition(Infinity, 1, this.player.beatsPerBar);
            } else {
                console.error("You must specify a loopLength for pattern " + this.patternId + " if loop is set to true.");
            }
            if (this.currentBeat === this.loopLength) {
                console.log(this.currentBeat);
                this.currentBeat = 1;
            }
        } else {
            this.removeAtSongPosition = clonePosition.call(this, this.addAtSongPosition);
            var offsetInBeats = this.beatPattern.endPosition - this.currentBeat;
            this.removeAtSongPosition.addOffset({
                bar: 0,
                beats: offsetInBeats
            });
        }
    };
    DMAF.Processor.BeatPatternInstance.prototype = {
        gotoNextBeat: function () {
            this.currentBeat++;
            if (this.loop && this.currentBeat > this.loopLength) {
                this.currentBeat = 1;
            }
        },
        executeEvents: function (eventTime, beatLength) {
            var events = this.beatPattern.events[this.currentBeat];
            if (!events) {
                return;
            }
            for (var i = 0, ii = events.length; i < ii; i++) {
                events[i].execute(eventTime, beatLength);
            }
        }
    };
    DMAF.Processor.BeatPattern = function (patternId, startPosition) {
        this.events = {};
        this.patternId = patternId;
        this.startPosition = startPosition || 1;
        this.endPosition = 0;
    };
    DMAF.Processor.BeatPattern.prototype = {
        addEvent: function (eventName, beat, tick, data) {
            this.events[beat] = this.events[beat] || [];
            this.events[beat].push(new SynthEvent(eventName, beat, tick, data));
            if (beat + 1 > this.endPosition) {
                this.endPosition = beat + 1;
            }
        }
    };
    DMAF.Processor.BeatPosition = function (bar, beat, beatsPerBar) {
        this.bar = bar === undefined ? 1 : bar;
        this.beat = beat === undefined ? 1 : beat;
        this.beatsPerBar = beatsPerBar === undefined ? 16 : beatsPerBar;
    };
    DMAF.Processor.BeatPosition.prototype = {
        getInBeats: function () {
            return ((this.bar - 1) * this.beatsPerBar) + this.beat;
        },
        gotoNextBeat: function () {
            if (this.beat === this.beatsPerBar) {
                this.bar++;
                this.beat = 1;
            } else {
                this.beat++;
            }
        },
        addOffset: function (offset) {
            this.beat += offset.beat;
            while (this.beat > this.beatsPerBar) {
                this.bar++;
                this.beat -= this.beatsPerBar;
            }
            this.bar += offset.bar;
        }
    };
    function SynthEvent(eventName, beat, tick, data) {
        this.eventName = eventName;
        this.beat = beat;
        this.tick = tick || 1;
        this.data = data;
    }
    SynthEvent.prototype.execute = function (eventTime, beatLength) {
        var data = Object.create(this.data);
        //add the tick time to the start time
        eventTime = ~~(eventTime + ((this.tick - 1) * (beatLength / 120)));
        //start time plus the difference in ticks, converted to time, between the start time and the next occuring noteOff
        data.duration = (eventTime + ((data.duration * (beatLength / 120)) / 1000)) - eventTime;
        data.duration *= 1000;
        DMAF.ActionManager.onEvent(this.eventName, eventTime, data);
    };
    function clonePosition(position) {
        return new DMAF.Processor.BeatPosition(position.bar, position.beat, this.player.beatsPerBar);
    }
});