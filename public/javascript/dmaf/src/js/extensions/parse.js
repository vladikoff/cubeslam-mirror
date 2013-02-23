dmaf.once("load_core", function (DMAF) {
    var types = ["int", "float", "string", "boolean", "list", "array", "enum"],
        attr = "getAttribute",
        propertyModel = {
            "automatable": "boolean",
            "default": "fromType",
            "valueType": "string",
            "loadEvent": "string",
            "value": "fromType",
            "min": "fromType",
            "max": "fromType",
            "name": "string",
            "type": "string",
            "values": "list",
            "unit": "string",
            "src": "string"
        },
        separator = /[\,]/;

    DMAF.parse = function (type) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (parsers[type]) {
            return parsers[type].apply(DMAF, args);
        } else {
            console.log("DMAF.parse: invalid type", type);
            return null;
        }
    };
    var parsers = {
        midi: parseMidiFile,
        samplemap: parseSampleMap
    };

    function parseSampleMap(xml) {
        if (!xml) {
            console.log("Problem parsing XML", arguments);
            return;
        }
        var maps = xml.querySelectorAll("samplemap"),
            keys = ["sound", "root", "low", "hi", "vol"],
            i, ii, j, jj, k, kk, map, ranges, name;
        for (i = 0, ii = maps.length; i < ii; i++) {
            map = maps[i];
            name = map.getAttribute("name");
            ranges = map.querySelectorAll("range");
            Assets.sampleMap[name] = {};
            for (j = 0, jj = ranges.length; j < jj; j++) {
                Assets.sampleMap[name]["range_" + j] = {
                    sound: ranges[j].getAttribute("sound"),
                    root: ranges[j].getAttribute("root"),
                    low: ranges[j].getAttribute("low"),
                    hi: ranges[j].getAttribute("hi"),
                    vol: parseFloat(ranges[j].getAttribute("vol"))
                };
            }
        }
    }
    //Parse a midi file from a filtered text stream. Super of Class :: Midi
    function parseMidiFile (rawData, type, fileName) {
        var midi = new Midi(rawData);
        switch (type) {
            case "beatPattern":
                midiToBeatPattern(midi, fileName);
                break;
            case "timePattern":
                midiToTimePattern(midi, fileName);
                break;
            default:
                midiToBeatPattern(midi, fileName);
        }
    }
    //A Midi event with type/subtype/midiNote etc.
    function MidiEvent(stream, absoluteTime, parser) {
        this.absoluteTime = absoluteTime + stream.readVariableLengthInt();
        var eventTypeByte = stream.read8BitInt();
        if ((eventTypeByte & 0xf0) == 0xf0) {
            this.getMetaEvent(stream, eventTypeByte);
        } else {
            this.getChannelEvent(stream, eventTypeByte, parser);
        }
    }
    MidiEvent.prototype = {
        getMetaEvent: function (stream, eventTypeByte) {
            var length,
                subtypeByte;
            if (eventTypeByte == 0xff) { /* meta event */
                this.type = 'meta';
                subtypeByte = stream.read8BitInt();
                length = stream.readVariableLengthInt();
                switch (subtypeByte) {
                case 0x00:
                    this.subtype = 'sequenceNumber';
                    if (length != 2) return;
                    this.number = stream.read16BitInt();
                    return;
                case 0x01:
                    this.subtype = 'text';
                    this.text = stream.readTo(length);
                    return;
                case 0x02:
                    this.subtype = 'copyrightNotice';
                    this.text = stream.readTo(length);
                    return;
                case 0x03:
                    this.subtype = 'trackName';
                    this.text = stream.readTo(length);
                    return;
                case 0x04:
                    this.subtype = 'instrumentName';
                    this.text = stream.readTo(length);
                    return;
                case 0x05:
                    this.subtype = 'lyrics';
                    this.text = stream.readTo(length);
                    return;
                case 0x06:
                    this.subtype = 'marker';
                    this.text = stream.readTo(length);
                    return;
                case 0x07:
                    this.subtype = 'cuePoint';
                    this.text = stream.readTo(length);
                    return;
                case 0x20:
                    this.subtype = 'midiChannelPrefix';
                    if (length !== 1) return;
                    this.channel = stream.read8BitInt();
                    return;
                case 0x2f:
                    this.subtype = 'endOfTrack';
                    if (length !== 0) return;
                    return;
                case 0x51:
                    this.subtype = 'setTempo';
                    if (length != 3) return;
                    this.microsecondsPerBeat = (
                    (stream.read8BitInt() << 16) + (stream.read8BitInt() << 8) + stream.read8BitInt());
                    return;
                case 0x54:
                    this.subtype = 'smpteOffset';
                    if (length != 5) return;
                    var hourByte = stream.read8BitInt();
                    this.frameRate = {
                        0x00: 24,
                        0x20: 25,
                        0x40: 29,
                        0x60: 30
                    }[hourByte & 0x60];
                    this.hour = hourByte & 0x1f;
                    this.min = stream.read8BitInt();
                    this.sec = stream.read8BitInt();
                    this.frame = stream.read8BitInt();
                    this.subframe = stream.read8BitInt();
                    return;
                case 0x58:
                    this.subtype = 'timeSignature';
                    if (length !== 4) return;
                    this.numerator = stream.read8BitInt();
                    this.denominator = Math.pow(2, stream.read8BitInt());
                    this.metronome = stream.read8BitInt();
                    this.thirtyseconds = stream.read8BitInt();
                    return;
                case 0x59:
                    this.subtype = 'keySignature';
                    if (length !== 2) return;
                    this.key = stream.read8BitInt();
                    this.scale = stream.read8BitInt();
                    return;
                case 0x7f:
                    this.subtype = 'sequencerSpecific';
                    this.data = stream.readTo(length);
                    return;
                default:
                    this.subtype = 'unknown';
                    this.data = stream.readTo(length);
                    return;
                }
                this.data = stream.readTo(length);
                return;
            } else if (eventTypeByte == 0xf0) {
                this.type = 'sysEx';
                length = stream.readVariableLengthInt();
                this.data = stream.readTo(length);
                return;
            } else if (eventTypeByte == 0xf7) {
                this.type = 'dividedSysEx';
                length = stream.readVariableLengthInt();
                this.data = stream.readTo(length);
                return;
            } else {
                this.type = 'unknown';
                length = stream.readVariableLengthInt();
                this.data = stream.readTo(length);
                console.error('unknown MIDI event type byte of length' + length);
            }
        },
        getChannelEvent: function (stream, eventTypeByte, parser) {
            var eventType,
                param1;
            if ((eventTypeByte & 0x80) === 0) {
                param1 = eventTypeByte;
                eventTypeByte = parser.lastEventType;
            } else {
                param1 = stream.read8BitInt();
                parser.lastEventType = eventTypeByte;
            }
            eventType = eventTypeByte >> 4;
            this.channel = eventTypeByte & 0x0f;
            this.type = 'channel';
            switch (eventType) {
                case 0x08:
                    this.subtype = 'noteOff';
                    this.midiNote = param1;
                    this.velocity = stream.read8BitInt();
                    break;
                case 0x09:
                    this.midiNote = param1;
                    this.velocity = stream.read8BitInt();
                    if (this.velocity === 0) {
                        this.subtype = 'noteOff';
                    } else {
                        this.subtype = 'noteOn';
                    }
                    break;
                case 0x0a:
                    this.subtype = 'noteAftertouch';
                    this.midiNote = param1;
                    this.amount = stream.read8BitInt();
                    break;
                case 0x0b:
                    this.subtype = 'controller';
                    this.controllerType = param1;
                    this.value = stream.read8BitInt();
                    break;
                case 0x0c:
                    this.subtype = 'programChange';
                    this.programNumber = param1;
                    break;
                case 0x0d:
                    this.subtype = 'channelAftertouch';
                    this.amount = param1;
                    break;
                case 0x0e:
                    this.subtype = 'pitchBend';
                    this.value = param1 + (stream.read8BitInt() << 7);
                    break;
                default:
                    this.subtype = 'unknown';
                    console.error('Unrecognised MIDI event type: ' + eventType);
            }
        }
    };
    //A stateful midiStream containing a string with midi data and methods to parse.
    function MidiStream (midiString) {
        this.pointer = 0;
        this.midiString = midiString;
    }
    MidiStream.prototype = {
        read32BitInt: function () {
            var result = ((this.midiString.charCodeAt(this.pointer) << 24) +
                (this.midiString.charCodeAt(this.pointer + 1) << 16) +
                (this.midiString.charCodeAt(this.pointer + 2) << 8) +
                this.midiString.charCodeAt(this.pointer + 3));
            this.pointer += 4;
            return result;
        },
        read16BitInt: function () {
            var result = ((this.midiString.charCodeAt(this.pointer) << 8) +
                this.midiString.charCodeAt(this.pointer + 1));
            this.pointer += 2;
            return result;
        },
        read8BitInt: function () {
            var result = this.midiString.charCodeAt(this.pointer);
            this.pointer += 1;
            return result;
        },
        readTo: function (pos) {
            var result = this.midiString.substr(this.pointer, pos);
            this.pointer += pos;
            return result;
        },
        endOfFile: function () {
            return this.pointer >= this.midiString.length;
        },
        readVariableLengthInt: function () {
            var returnInt = 0;
            while (true) {
                var byten = this.read8BitInt();
                if (byten & 0x80) {
                    returnInt += (byten & 0x7f);
                    returnInt <<= 7;
                } else {
                    return returnInt + byten;
                }
            }
        }
    };
    //Top level that recieves the raw midi data.
    function Midi (rawString) {
        MidiStream.call(this, rawString.split("").map(fromChar).join(""));
        this.tracks = [];
        this.chunk = {};
        this.lastEventType = 0x00;
        this.getNextChunk("MThd").readHeader().getTracks();
    }
    Midi.prototype = Object.create(MidiStream.prototype, {
        readHeader: {
            value: function () {
                var headerStream = new MidiStream(this.chunk.data);
                this.formatType = headerStream.read16BitInt();
                this.trackCount = headerStream.read16BitInt();
                this.ticksPerBeat = headerStream.read16BitInt();
                if (this.ticksPerBeat & 0x8000) {
                    this.ticksPerBeat = 480;
                    console.log("Time division in SMPTE, defaulting to 480 ticks per beat");
                }
                this.beatLengthInTicks = this.ticksPerBeat / 4;
                return this;
            }
        },
        getTracks: {
            value: function () {
                var trackStream,
                    absoluteTime,
                    event;
                for (var i = 0, ii = this.trackCount; i < ii; i++) {
                    this.tracks[i] = [];
                    absoluteTime = 0;
                    this.getNextChunk("MTrk");
                    trackStream = new MidiStream(this.chunk.data);
                    while (!trackStream.endOfFile()) {
                        event = new MidiEvent(trackStream, absoluteTime, this);
                        this.tracks[i].push(event);
                        absoluteTime = event.absoluteTime;
                    }
                }
                return this;
            }
        },
        getNextChunk: {
            value: function (type) {
                this.chunk.id = this.readTo(4);
                this.chunk.length = this.read32BitInt();
                this.chunk.data = this.readTo(this.chunk.length);
                if (this.chunk.id !== type) {
                    throw new Error("MidiParser expected", type, "but found", this.chunk.id);
                }
                return this;
            }
        }
    });
    //Translaste midi result to a timePattern
    function midiToTimePattern (midi, fileName) {
        var patternId,
            pattern,
            timeEvents,
            events,
            event,
            track,
            i, ii,
            j, jj,
            k, t,
            bpm;
        for (i = 0, ii = midi.trackCount; i < ii; i++) {
            events = midi.tracks[i];
            patternId = events[0].text || fileName + i + "";
            trigger = events[1].text || fileName + i + "";
            timeEvents = [];
            for (j = 0, jj = events.length; j < jj; j++) {
                if (events[j].subtype === "setTempo") {
                    bpm = 60000000 / events[j].microsecondsPerBeat;
                    break;
                }
            }
            for (j = 0, jj = events.length; j < jj; j++) {
                if (events[j].subtype === "noteOn") {
                    event = events[j];
                    event.type = event.subtype;
                    event.trigger = trigger;
                    for (k = j; k < jj; k++) {
                        if (getDuration(events[k], event)) break;
                    }
                    event.absoluteTime = (event.absoluteTime * 60000) / (midi.ticksPerBeat * bpm) + 1;
                    event.duration = (event.duration * 60000) / (midi.ticksPerBeat * bpm);
                    timeEvents.push(event);
                }
            }
            pattern = new DMAF.Processor.TimePattern(patternId, timeEvents);
            DMAF.setAsset("timePattern", patternId, pattern);
        }
    }
    //Translate midi result ot a beatPattern
    function midiToBeatPattern (midi, fileName) {
        var patternId,
            duration,
            trigger,
            pattern,
            events,
            event,
            i, ii,
            j, jj,
            beat,
            tick, k;
        for (i = 1, ii = midi.trackCount; i < ii; i++) {
            events = midi.tracks[i];
            patternId = events[0].text || fileName + i + "";
            trigger = events[1].text || fileName + i + "";
            pattern = new DMAF.Processor.BeatPattern(patternId, 1);
            for (j = 2, jj = events.length; j < jj; j++) {
                if (events[j].subtype === "noteOn") {
                    event = events[j];
                    event.type = event.subtype;
                    beat = Math.floor(event.absoluteTime / midi.beatLengthInTicks);
                    tick = Math.floor(event.absoluteTime - beat * midi.beatLengthInTicks);
                    for (k = j; k < jj; k++) {
                        if (getDuration(events[k], event)) break;
                    }
                    pattern.addEvent(trigger, beat + 1, tick + 1, event);
                }
            }
            DMAF.setAsset("beatPattern", patternId, pattern);
        }
    }
    //Get the duration of a midi noteOn event
    function getDuration (a, b) {
        var asubtype = (a.subtype === "noteOn" || a.subtype === "noteOff") && a.subtype;
        if (!asubtype || a.midiNote !== b.midiNote) return false;
        if (asubtype === "noteOn" && !a.velocity || asubtype === "noteOff") {
            return b.duration = a.absoluteTime - b.absoluteTime;
        }
    }
    //Return the character from the character code of a chracter bitwise & 255
    function fromChar (string) {
        return String.fromCharCode(string.charCodeAt(0) & 255);
    }
});