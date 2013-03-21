"use-strict";
var dmaf = {};
(function (global, audiocontext) {
    var isBrowser = !!(typeof window !== 'undefined' && navigator && document),
        slice = Array.prototype.slice,
        hasContext = !!audiocontext,
        pendingObjects = [],
        pendingTell = [],
        removed = false,
        stop = false,
        events = {};

    //Private interface
    var DMAF = {
        dispatch: function (eventName) {
            var e = events,
                result = [],
                args = slice.call(arguments, 1);
            stop = false;
            e = events[eventName];
            if (!e) e = result;
            for (var i = 0; i < e.length; i++) {
                result.push(e[i].apply(e[i].context, args));
                if (removed) i--, removed = false;
                if (stop) break;
            }
            return result.length ? result : null;
        },
        context: hasContext ? new audiocontext() : {
            currentTime: 0
        },
        hasContext: hasContext,
        pendingObjects: {},
        Settings: {}
    },
    verifyUrl = /^dmaf\=/,
    urlSplit = global.location && global.location.href.split("?") || [],
    scripts = {
        toLoad: 0,
        loaded: 0
    };

    dmaf.addEventListener = dmafAddEventListener;
    dmaf.removeEventListener = dmafRemoveEventListener;
    dmaf.once = once;
    dmaf.tell = preTell;
    dmaf.registerObject = preRegisterObject;
    dmaf.unregisterObject = blank;
    if (isBrowser) {
        global.dmaf = dmaf;
    } else {
        dmaf.core = DMAF;
    }
    dmaf.once(hasContext ? "dmaf_ready" : "dmaf_fail", flushPending);
    for (var i = 0; i < urlSplit.length; i++) {
        if (verifyUrl.test(urlSplit[i])) {
            urlSplit[i] = urlSplit[i].replace(verifyUrl, "");
            DMAF.Settings.projectPath = urlSplit[i];
            break;
        }
    }
    if (!!DMAF.Settings.projectPath) {
        dmaf.init = devInit;
        dmaf.once = blank;
    } else {
        dmaf.init = productionInit;
    }
    function loadScript(src, callback) {
        var script = document.createElement("script");
        script.type = "text/javascript";
        script.charset = 'utf-8';
        script.async = true;
        script.onload = function loadScriptCallback () {
            callback();
            setTimeout(function removeScript () {document.body.removeChild(script);}, 1);
        };
        script.src = src;
        document.body.appendChild(script);
    }
    function xhr (path, type, callback) {
        var req = new XMLHttpRequest();
        req.responseType = type;
        req.onload = function onload () {
            callback(this.response);
        };
        req.open("GET", path, true);
        req.send();
    }
    function blank () {

    }
    function tell (eventName, eventProperties, eventTime) {
        if (dmaf.log) console.log("dmaf.tell:", eventName);
        if (!eventTime) eventTime = DMAF.context.currentTime * 1000;
        DMAF.ActionManager.onEvent(eventName, eventTime, eventProperties);
    }
    function preTell () {
        pendingTell.push(arguments);
    }
    function dmafAddEventListener (eventName, handler, context) {
        var e = events;
        e = e[eventName] || (e[eventName] = []);
        for (var i = 0, ii = e.length; i < ii; i++) if (e[i] === handler) {
            return handler;
        }
        handler.context = (context && typeof context === "object") ? context : dmaf;
        e.push(handler);
    }
    function dmafRemoveEventListener (eventName, handler) {
        var e = events[eventName],
            i;
        if (!e || !e.length) {
            return false;
        }
        i = e.length;
        while (i--) if (e[i] == handler) {
            e.splice(i, 1);
            removed = true;
            break;
        }
    }
    function once (eventName, handler, context) {
        handler.context = (context && typeof context === "object") ? context : dmaf;
        var one = function () {
            var result = handler.apply(context, arguments);
            dmaf.removeEventListener(eventName, one);
            return result;
        };
        dmaf.addEventListener(eventName, one, context);
    }
    function dmafstop () {
        stop = true;
    }
    function registerObject (id, obj) {
        if (typeof id === "string") {
            if (!id) {
                if (dmaf.log) console.log("DMAF: You must provide a valid id for the object you wish to register.");
                return 1;
            }
        } else {
            if (dmaf.log) console.log("DMAF: You must provide a valid id for the object you wish to register.");
            return 2;
        }
        if (!obj || !(obj instanceof Object)) {
            if (dmaf.log) console.log("DMAF: You've tried to register an object not of type 'object'");
            return 3;
        }

        if (!obj.instanceId) {
            obj.instanceId = id;
        }
        DMAF.pendingObjects[id] = obj;
        DMAF.ActionManager.onEvent(id + ".CREATE");
    }
    function preRegisterObject () {
        pendingObjects.push(arguments);
    }
    function unregisterObject (id) {
        var instance = DMAF.pendingObjects[id],
            returnVal = false;
        if (instance) {
            returnVal = delete DMAF.pendingObjects[id];
        }
        instance = DMAF.getInstance("customCode:" + id);
        if (instance) {
            returnVal = DMAF.removeInstance("customCode:" + id);
        }
        instance = DMAF.getInstance("mediaElement:" + id);
        if (instance) {
            returnVal = DMAF.removeInstance("mediaElement:" + id);
        }
        if (returnVal) DMAF.ActionManager.onEvent(id + ".REMOVE");
        return false;
    }
    function devInit () {
        xhr(DMAF.Settings.projectPath + "project.xml", "document", parseProjectXML);
    }
    function productionInit (assetsPath) {
        dmaf.init = blank;
        DMAF.dispatch("load_core", DMAF);
        if (assetsPath && typeof assetsPath === "string") {
            DMAF.Settings.assetsPath = assetsPath;
        }
        proceedInit();
    }
    function proceedInit () {
        if (hasContext) {
            DMAF.Utils.getFileFormat();
            DMAF.dispatch("load_modules", DMAF);
            DMAF.ActionManager.populate();
        } else {
            failure();
        }
    }
    function parseProjectXML (xml) {
        var framework = xml.querySelector("framework"),
            version = xml.querySelector("version"),
            scripts = xml.querySelector("include");

        version = version && version.getAttribute("value");
        framework = framework && framework.getAttribute("path");
        scripts = (scripts && scripts.getAttribute("scripts") && scripts.getAttribute("scripts").split(",")) || [];
        if (!framework) {
            throw new TypeError("Missing framework path.");
        }

        DMAF.Settings.customScripts = scripts;
        DMAF.Settings.version = version || "0.x";
        DMAF.Settings.frameworkPath = framework;
        DMAF.Settings.configPath = DMAF.Settings.projectPath + "config.xml";
        DMAF.Settings.assetsPath = DMAF.Settings.projectPath + "assets/";
        if (scripts.length) {
            for (var i = 0; i < scripts.length; i++) {
                scripts[i] = DMAF.Settings.assetsPath + "js/" + scripts[i];
            }
        }
        xhr(framework + "src/scripts.json", "text", onRegistryLoad);
    }
    function onRegistryLoad (response) {
        var registry = JSON.parse(response), path;
        registry = registry.concat(DMAF.Settings.customScripts);
        scripts.toLoad = registry.length;
        dmaf.once = once;
        console.log("Loading dmaf from:", DMAF.Settings.frameworkPath);
        for (var i = 0; i < scripts.toLoad; i++) {
            path = /http/.test(registry[i]) ? registry[i] : DMAF.Settings.frameworkPath + registry[i];
            loadScript(path, onScriptLoad);
        }
    }
    function onScriptLoad () {
        if (++scripts.loaded === scripts.toLoad) {
            dmaf.once("load_core", onCoreLoad);
            DMAF.dispatch("load_core", DMAF);
            if (DMAF.ActionManager) {
                console.log("You are now running Dinahmoe Web Audio Framework version:", DMAF.Settings.version);
            }
            DMAF.Utils.getFileFormat();
            console.log("dmaf file format is now", DMAF.fileFormat);
        }
    }
    function onCoreLoad (privateFramework) {
        xhr(DMAF.Settings.frameworkPath + "src/xml/descriptors.xml", "document", onDescriptorsLoad);
    }
    function onDescriptorsLoad (xml) {
        DMAF.Settings.descriptors = DMAF.Parser.parseDescriptors(xml);
        if (DMAF.Settings.descriptors) {
            console.log("dmaf has succesfully parsed", DMAF.Settings.frameworkPath + "src/xml/descriptors.xml");
        } else {
            throw new Error("dmaf could not parse descriptors!");
        }
        xhr(DMAF.Settings.configPath, "document", onConfigLoad);
    }
    function onConfigLoad (xml) {
        DMAF.Settings.actions = DMAF.Parser.parseActions(xml, DMAF.Settings.descriptors);
        if (DMAF.Settings.actions) {
            console.log("dmaf has succesfully parsed:", DMAF.Settings.configPath);
        } else {
            throw new Error("dmaf could not parse the config file!");
        }
        if (hasContext) {
            DMAF.dispatch("load_modules", DMAF);
            console.log("dmaf modules are now active.");
            DMAF.ActionManager.populate();
            console.log("Action Manager is now populated.");
            global.DMAF = DMAF;
            dmaf.log = true;
        } else {
            failure();
        }
    }
    function flushPending () {
        var i, ii, args;
        dmaf.registerObject = registerObject;
        dmaf.unregisterObject = unregisterObject;
        for (i = 0, ii = pendingObjects.length; i < ii; i++) {
            args = slice.call(pendingObjects[i]);
            dmaf.registerObject.apply(dmaf, args);
        }
        dmaf.tell = tell;
        if (pendingTell.length && dmaf.log) console.log("had pending");
        for (i = 0, ii = pendingTell.length; i < ii; i++) {
            args = slice.call(pendingTell[i]);
            dmaf.tell.apply(dmaf, args);
        }
    }
    function failure () {
        dmaf.tell = blank;
        dmaf.registerObject = blank;
        dmaf.unregisterObject = blank;
        dmaf.init = blank;
        DMAF.dispatch("dmaf_fail");
    }
    //Take care of require and AMD
    if (typeof module !== "undefined" && module.exports) {
        module.exports = dmaf;
    } else if (typeof define !== "undefined") {
        define("dmaf", [], function() { return dmaf; });
    }
})(this, this.webkitAudioContext || this.AudioContext);
dmaf.once('load_core',function(DMAF){DMAF.Settings={"descriptors":{"validActions":["loadCustomCode","loadSound","loadMIDI","loadSampleMap","customCode","userObject","mediaElement","mediaController","genericPlay","stepPlay","soundStop","midiProcessor","makeNote","transform","macro","state","eventMapper","midiNoteMapper","timePatternPlayer","beatPatternPlayer","sampler","audioBus"],"validTypes":["noteMap","stateMap","eventMap","file","map","target","sampleMapGroup","sampleMap","start","stop","beatEvent","add","band","chorus","overdrive","compressor","cabinet","filter","convolver","delay","envelopeFollower","equalizer","lfo","phaser","pingPongDelay","tremolo","wahWah"],"action":{"assetController":{"loadCustomCode":{"type":"assetController","id":"loadCustomCode","instanceId":{"name":"instanceId","type":"string"},"returnEvent":{"name":"returnEvent","type":"string"},"files":{"name":"files","type":"array","valueType":"file"},"":{"type":"assetController"}},"type":"assetController","loadSound":{"type":"assetController","id":"loadSound","instanceId":{"name":"instanceId","type":"string"},"returnEvent":{"name":"returnEvent","type":"string"},"files":{"name":"files","type":"array","valueType":"file"},"":{"type":"assetController"}},"loadMIDI":{"type":"assetController","id":"loadMIDI","instanceId":{"name":"instanceId","type":"string"},"returnEvent":{"name":"returnEvent","type":"string"},"files":{"name":"files","type":"array","valueType":"file"},"":{"type":"assetController"}},"loadSampleMap":{"type":"assetController","id":"loadSampleMap","instanceId":{"name":"instanceId","type":"string"},"returnEvent":{"name":"returnEvent","type":"string"},"files":{"name":"files","type":"array","valueType":"file"},"":{"type":"assetController"}}},"customCode":{"customCode":{"type":"customCode","id":"customCode","instanceId":{"name":"instanceId","type":"string"},"":{"type":"customCode"}},"type":"customCode","userObject":{"type":"customCode","id":"userObject","instanceId":{"name":"instanceId","type":"string"},"":{"type":"customCode"}}},"mediaElement":{"mediaElement":{"type":"mediaElement","id":"mediaElement","instanceId":{"name":"instanceId","type":"string"},"":{"type":"mediaElement"}},"type":"mediaElement"},"control":{"mediaController":{"type":"control","id":"mediaController","instanceId":{"name":"instanceId","type":"string","default":"multi"},"":{"type":"control"}},"type":"control"},"sound":{"genericPlay":{"type":"sound","id":"genericPlay","delay":{"name":"delay","type":"int","default":0,"min":-1000000,"max":1000000},"instanceId":{"name":"instanceId","type":"string","default":"multi"},"soundFile":{"name":"soundFile","type":"string","default":"multi"},"multiSuffix":{"name":"multiSuffix","type":"string","default":""},"volume":{"name":"volume","type":"float","unit":"dB","default":0,"min":-90,"max":48},"pan":{"name":"pan","type":"int","default":0,"min":-100,"max":100},"loop":{"name":"loop","type":"int","unit":"mS","default":-1,"min":-2,"max":100000},"reTrig":{"name":"reTrig","type":"int","unit":"mS","default":-1,"min":-1,"max":100000},"returnEvent":{"name":"returnEvent","type":"string"},"returnEventTime":{"name":"returnEventTime","type":"int","unit":"mS","default":-1,"min":-1000000,"max":100000},"preListen":{"name":"preListen","type":"int","default":0,"min":0,"max":500},"bus":{"name":"bus","type":"string","default":"master"},"priority":{"name":"priority","type":"boolean","default":false},"timingCorrection":{"name":"timingCorrection","type":"enum","default":"PLAY","values":["RESYNC","SYNC","PLAY"]},"":{"type":"sound"}},"type":"sound","stepPlay":{"type":"sound","id":"stepPlay","delay":{"name":"delay","type":"int","default":0,"min":0,"max":100000},"instanceId":{"name":"instanceId","type":"string"},"soundFiles":{"name":"soundFiles","type":"list"},"generator":{"name":"generator","type":"enum","default":"SHUFFLE","values":["SHUFFLE","RANDOM","RANDOM_FIRST","ROUND_ROBIN"]},"volume":{"name":"volume","type":"float","default":0,"min":-90,"max":48},"pan":{"name":"pan","type":"int","default":0,"min":-100,"max":100},"reTrig":{"name":"reTrig","type":"int","default":-1,"min":-1,"max":100000},"returnEvent":{"name":"returnEvent","type":"string","default":"","values":["ALL"]},"returnEventTime":{"name":"returnEventTime","type":"int","default":-1,"min":-1000000,"max":100000},"preListen":{"name":"preListen","type":"int","default":0,"min":0,"max":500},"bus":{"name":"bus","type":"string","default":"master","values":["ALL"]},"priority":{"name":"priority","type":"boolean","default":false},"timingCorrection":{"name":"timingCorrection","type":"enum","default":"SYNC","values":["SYNC","PLAY"]},"":{"type":"sound"}},"soundStop":{"type":"sound","id":"soundStop","delay":{"name":"delay","type":"int","default":0,"min":0,"max":9999999},"targets":{"name":"targets","type":"list"},"multiSuffix":{"name":"multiSuffix","type":"string","default":""},"":{"type":"sound"}}},"midiProcessor":{"midiProcessor":{"type":"midiProcessor","id":"midiProcessor","instanceId":{"name":"instanceId","type":"string"},"transpose":{"name":"transpose","type":"int","default":0,"min":-127,"max":127},"dynamic":{"name":"dynamic","type":"int","default":0,"min":-127,"max":127},"quantize":{"name":"quantize","type":"string"},"scale":{"name":"scale","type":"string","values":["off","major","harmonicMinor","naturalMinor","majorPentatonic","minorPentatonic","dorian","phyrgian","lydian","mixolydian","locrian","doubleHarmonic","halfDim","custom","off"]},"customScale":{"name":"customScale","type":"string","default":"0,0,0,0,0,0,0,0,0,0,0,0"},"root":{"name":"root","type":"string","default":"C","values":["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]},"":{"type":"midiProcessor"}},"type":"midiProcessor","makeNote":{"type":"midiProcessor","id":"makeNote","instanceId":{"name":"instanceId","type":"string","default":"someProcessor"},"noteMaps":{"name":"noteMaps","type":"array","valueType":"noteMap"},"":{"type":"midiProcessor"}}},"parameterProcessor":{"transform":{"type":"parameterProcessor","id":"transform","instanceId":{"name":"instanceId","type":"string"},"delay":{"name":"delay","type":"int","default":0,"min":0,"max":9999999},"targetType":{"name":"targetType","type":"enum","default":"SOUND","values":["sound","audioRouter","synth"]},"targets":{"name":"targets","type":"list"},"targetParameter":{"name":"targetParameter","type":"string"},"multiSuffix":{"name":"multiSuffix","type":"string"},"value":{"name":"value","type":"float","default":0,"min":-9999999,"max":9999999},"duration":{"name":"duration","type":"int","default":0,"min":0,"max":9999999},"curve":{"name":"curve","type":"int","default":0,"min":-100,"max":100},"":{"type":"parameterProcessor"}},"type":"parameterProcessor","macro":{"type":"parameterProcessor","id":"macro","instanceId":{"name":"instanceId","type":"string"},"delay":{"name":"delay","type":"int","default":0,"min":0,"max":9999999},"macroTargets":{"name":"macroTargets","type":"array","valueType":"macroTarget"},"":{"type":"parameterProcessor"}}},"stateProcessor":{"state":{"type":"stateProcessor","id":"state","instanceId":{"name":"instanceId","type":"string"},"update":{"name":"update","type":"enum","default":"onChange","values":["onChange","always"]},"stateMaps":{"name":"stateMaps","type":"array","valueType":"stateMap"},"":{"type":"stateProcessor"}},"type":"stateProcessor"},"eventProcessor":{"eventMapper":{"type":"eventProcessor","id":"eventMapper","instanceId":{"name":"instanceId","type":"string"},"eventMaps":{"name":"eventMaps","type":"array","valueType":"eventMap"},"":{"type":"eventProcessor"}},"type":"eventProcessor","midiNoteMapper":{"type":"eventProcessor","id":"midiNoteMapper","instanceId":{"name":"instanceId","type":"string"},"eventMaps":{"name":"eventMaps","type":"array","valueType":"eventMap"},"":{"type":"eventProcessor"}}},"player":{"timePatternPlayer":{"type":"player","id":"timePatternPlayer","instanceId":{"name":"instanceId","type":"string","default":"master_time_player"},"behavior":{"name":"behavior","type":"enum","values":["LINEAR","DEFAULT"],"default":"DEFAULT"},"":{"type":"player"}},"type":"player","beatPatternPlayer":{"type":"player","id":"beatPatternPlayer","instanceId":{"name":"instanceId","type":"string","default":"master_beat_player"},"flowItems":{"name":"flowItems","type":"array","valueType":"flowItem"},"":{"type":"player"}}},"synth":{"sampler":{"type":"synth","id":"sampler","instanceId":{"name":"instanceId","type":"string"},"ignoreNoteOff":{"name":"ignoreNoteOff","type":"boolean","default":false},"bus":{"name":"bus","type":"string","default":"master"},"volume":{"name":"volume","type":"float","default":0,"min":-100,"max":10},"loop":{"name":"loop","type":"boolean","default":false},"ampAttack":{"name":"ampAttack","type":"int","default":0,"min":0,"max":500},"ampDecay":{"name":"ampDecay","type":"int","default":0,"min":0,"max":500},"ampRelease":{"name":"ampRelease","type":"int","default":0,"min":0,"max":1000},"ampSustain":{"name":"ampSustain","type":"float","default":1,"min":0,"max":1},"ampVelocityRatio":{"name":"ampVelocityRatio","type":"float","default":1,"min":0,"max":1},"filterOn":{"name":"filterOn","type":"boolean","default":false},"filterAttack":{"name":"filterAttack","type":"int","default":0,"min":0,"max":500},"filterDecay":{"name":"filterDecay","type":"int","default":0,"min":0,"max":500},"filterRelease":{"name":"filterRelease","type":"int","default":0,"min":0,"max":1000},"filterSustain":{"name":"filterSustain","type":"float","default":1,"min":0,"max":1},"filterVelocityRatio":{"name":"filterVelocityRatio","type":"float","default":1,"min":0,"max":1},"filterQ":{"name":"filterQ","type":"float","default":0.0001,"min":0.0001,"max":30},"filterFrequency":{"name":"filterFrequency","type":"int","default":0,"min":0,"max":10},"filterGain":{"name":"filterGain","type":"float","default":0,"min":0,"max":1},"audioNodes":{"name":"audioNodes","type":"array","valueType":"audioNode"},"sampleMapGroups":{"name":"sampleMapGroups","type":"array","valueType":"sampleMapGroup"},"":{"type":"synth"}},"type":"synth"},"audioRouter":{"audioBus":{"type":"audioRouter","id":"audioBus","instanceId":{"name":"instanceId","type":"string"},"outputBus":{"name":"outputBus","type":"string","default":"master"},"volume":{"name":"volume","type":"float","default":0,"min":-100,"max":10},"pan":{"name":"pan","type":"int","default":0,"min":-100,"max":100},"audioNodes":{"name":"audioNodes","type":"array","valueType":"audioNode"},"":{"type":"audioRouter"}},"type":"audioRouter"}},"type":{"noteMap":{"noteMap":{"type":"noteMap","id":"noteMap","triggerIn":{"name":"triggerIn","type":"string"},"triggerOut":{"name":"triggerOut","type":"string"},"note":{"name":"note","type":"string","default":"C4"},"velocity":{"name":"velocity","type":"int","min":0,"max":127,"default":127},"duration":{"name":"duration","type":"int","min":0,"max":9999999,"default":0},"":{"type":"noteMap"}},"type":"noteMap"},"stateMap":{"stateMap":{"type":"stateMap","id":"stateMap","in":{"name":"in","type":"list"},"state":{"name":"state","type":"string"},"":{"type":"stateMap"}},"type":"stateMap"},"eventMap":{"eventMap":{"type":"eventMap","id":"eventMap","in":{"name":"in","type":"list"},"out":{"name":"out","type":"string"},"delay":{"name":"delay","type":"int","default":0,"max":10000,"min":0},"":{"type":"eventMap"}},"type":"eventMap"},"file":{"file":{"type":{"name":"type","type":"enum","values":["beatPattern","timePattern"],"default":""},"id":"file","name":{"name":"name","type":"string"},"":{"type":"file"}},"type":"file"},"map":{"map":{"type":"map","id":"map","inValue":{"name":"inValue","type":"string"},"outValue":{"name":"outValue","type":"string"},"":{"type":"map"}},"type":"map"},"macroTarget":{"target":{"type":"macroTarget","id":"target","targetId":{"name":"targetId","type":"string"},"min":{"name":"min","type":"float","default":0,"min":0,"max":1},"max":{"name":"max","type":"float","default":1,"min":0,"max":1},"targetType":{"name":"targetType","type":"enum","default":"BUS","values":["SOUND","SYNTH","BUS"]},"targetParameter":{"name":"targetParameter","type":"string"},"":{"type":"macroTarget"}},"type":"macroTarget"},"sampleMapGroup":{"sampleMapGroup":{"type":"sampleMapGroup","id":"sampleMapGroup","name":{"name":"name","type":"string"},"sampleMaps":{"name":"sampleMaps","type":"array","valueType":"sampleMap"},"":{"type":"sampleMapGroup"}},"type":"sampleMapGroup"},"sampleMap":{"sampleMap":{"type":"sampleMap","id":"sampleMap","name":{"name":"name","type":"string"},"velocityLow":{"name":"velocityLow","type":"int","default":0,"min":0,"max":127},"velocityHigh":{"name":"velocityHigh","type":"int","default":127,"min":0,"max":127},"":{"type":"sampleMap"}},"type":"sampleMap"},"flowItem":{"start":{"type":"flowItem","id":"start","delay":{"name":"delay","type":"int","default":0,"min":0,"max":null},"tempo":{"name":"tempo","type":"float","default":120,"min":40,"max":280},"beatsPerBar":{"name":"beatsPerBar","type":"int","default":16,"min":1,"max":16},"meter":{"name":"meter","type":"list","default":["simple"],"value":["simple","compound"]},"subdivision":{"name":"subdivision","type":"string","default":"16","values":["1","2D","2","2T","4D","4","4T","8D","8","8T","16D","16","16T","32D","32","32T"]},"":{"type":"flowItem"}},"type":"flowItem","stop":{"type":"flowItem","id":"stop","songPosition":{"name":"songPosition","type":"string","default":"NEXT_BEAT"},"returnEvent":{"name":"returnEvent","type":"string"},"":{"type":"flowItem"}},"beatEvent":{"type":"flowItem","id":"beatEvent","songPosition":{"name":"songPosition","type":"string","default":"NEXT_BEAT"},"returnEvent":{"name":"returnEvent","type":"string"},"output":{"name":"output","type":"enum","default":"onEvent","values":["dispatch","onEvent"]},"":{"type":"flowItem"}},"add":{"type":"flowItem","id":"add","patternId":{"name":"patternId","type":"string","default":"multi"},"channel":{"name":"channel","type":"string","default":"main"},"songPosition":{"name":"songPosition","type":"string","default":"NEXT_BAR"},"patternPosition":{"name":"patternPosition","type":"enum","default":"SYNC","values":["SYNC","FIRST_BEAT"]},"clearPending":{"name":"clearPending","type":"boolean","default":true},"replaceActive":{"name":"replaceActive","type":"boolean","default":true},"setAsCurrent":{"name":"setAsCurrent","type":"boolean","default":true},"loop":{"name":"loop","type":"boolean","default":false},"loopLength":{"name":"loopLength","type":"int","default":129,"min":1,"max":65536},"clearPosition":{"name":"clearPosition","type":"string","default":"NEXT_BAR"},"":{"type":"flowItem"}}},"band":{"band":{"type":"band","id":"band","bandType":{"name":"bandType","type":"enum","default":"PEAKING","values":["LOWPASS","HIGHPASS","BANDPASS","LOWSHELF","HIGHSHELF","PEAKING","NOTCH","ALLPASS"],"automatable":false},"frequency":{"name":"frequency","type":"float","default":800,"min":20,"max":22050,"automatable":true},"Q":{"name":"Q","type":"float","default":1,"min":0,"max":100,"automatable":true},"gain":{"name":"gain","type":"float","default":0,"min":-40,"max":40,"automatable":true},"":{"type":"band"}},"type":"band"},"audioNode":{"chorus":{"type":"audioNode","id":"chorus","active":{"name":"active","type":"boolean","default":true},"feedback":{"name":"feedback","type":"float","default":0,"min":0,"max":1,"automatable":false},"delay":{"name":"delay","type":"float","default":0.0045,"min":0,"max":1,"automatable":false},"rate":{"name":"rate","type":"float","default":1.5,"min":0.01,"max":8,"automatable":false},"bypass":{"name":"bypass","type":"float","default":0,"min":0,"max":1,"automatable":false},"":{"type":"audioNode"}},"type":"audioNode","overdrive":{"type":"audioNode","id":"overdrive","active":{"name":"active","type":"boolean","default":true},"outputGain":{"name":"outputGain","type":"float","default":0,"min":0,"max":1,"automatable":true},"drive":{"name":"drive","type":"float","default":0,"min":0,"max":1,"automatable":true},"curveAmount":{"name":"curveAmount","type":"float","default":1,"min":0,"max":1,"automatable":true},"algorithmIndex":{"name":"algorithmIndex","type":"int","default":0,"min":0,"max":5,"automatable":false},"":{"type":"audioNode"}},"compressor":{"type":"audioNode","id":"compressor","active":{"name":"active","type":"boolean","default":true},"threshold":{"name":"threshold","type":"float","default":0,"min":-100,"max":0,"automatable":true},"makeupGain":{"name":"makeupGain","type":"float","default":1,"min":0,"max":100,"automatable":true},"attack":{"name":"attack","type":"float","default":1,"min":0,"max":1000,"automatable":true},"release":{"name":"release","type":"float","default":1,"min":0,"max":3000,"automatable":true},"ratio":{"name":"ratio","type":"float","default":4,"min":1,"max":20,"automatable":true},"knee":{"name":"knee","type":"float","default":5,"min":0,"max":40,"automatable":true},"automakeup":{"name":"automakeup","type":"boolean","default":false},"":{"type":"audioNode"}},"cabinet":{"type":"audioNode","id":"cabinet","active":{"name":"active","type":"boolean","default":true},"makeupGain":{"name":"makeupGain","type":"float","default":1,"min":0,"max":20,"automatable":true},"impulsePath":{"name":"impulsePath","type":"string"},"":{"type":"audioNode"}},"filter":{"type":"audioNode","id":"filter","active":{"name":"active","type":"boolean","default":true},"frequency":{"name":"frequency","type":"float","default":20,"min":20,"max":22050,"automatable":true},"Q":{"name":"Q","type":"float","default":1,"min":0,"max":100,"automatable":true},"gain":{"name":"gain","type":"float","default":0,"min":-40,"max":40,"automatable":true},"bypass":{"name":"bypass","type":"boolean","default":true,"automatable":true},"filterType":{"name":"filterType","type":"enum","default":"LOWPASS","values":["LOWPASS","HIGHPASS","BANDPASS","LOWSHELF","HIGHSHELF","PEAKING","NOTCH","ALLPASS"],"automatable":false},"":{"type":"audioNode"}},"convolver":{"type":"audioNode","id":"convolver","active":{"name":"active","type":"boolean","default":true},"highCut":{"name":"highCut","type":"float","default":22050,"min":20,"max":22050,"automatable":true},"lowCut":{"name":"lowCut","type":"float","default":20,"min":20,"max":22050,"automatable":true},"dryLevel":{"name":"dryLevel","type":"float","default":1,"min":0,"max":1,"automatable":true},"wetLevel":{"name":"wetLevel","type":"float","default":1,"min":0,"max":1,"automatable":true},"level":{"name":"level","type":"float","default":1,"min":0,"max":1,"automatable":true},"impulse":{"name":"impulse","type":"string"},"":{"type":"audioNode"}},"delay":{"type":"audioNode","id":"delay","active":{"name":"active","type":"boolean","default":true},"delayTime":{"name":"delayTime","type":"float","default":30,"min":0.001,"max":10000,"automatable":false},"feedback":{"name":"feedback","type":"float","default":0.45,"min":0,"max":0.9,"automatable":true},"cutoff":{"name":"cutoff","type":"float","default":20,"min":20,"max":22050,"automatable":true},"dryLevel":{"name":"dryLevel","type":"float","default":1,"min":0,"max":1,"automatable":true},"wetLevel":{"name":"wetLevel","type":"float","default":1,"min":0,"max":1,"automatable":true},"tempoSync":{"name":"tempoSync","type":"string","automatable":false},"subdivision":{"name":"subdivision","type":"enum","default":"8D","values":["1","2D","2","2T","4D","4","4T","8D","8","8T","16D","16","16T","32D","32","32T"],"automatable":false},"":{"type":"audioNode"}},"envelopeFollower":{"type":"audioNode","id":"envelopeFollower","active":{"name":"active","type":"boolean","default":true},"attackTime":{"name":"attackTime","type":"float","default":0.003,"min":0,"max":0.5,"automatable":false},"releaseTime":{"name":"releaseTime","type":"float","default":0.5,"min":0,"max":1,"automatable":false},"":{"type":"audioNode"}},"equalizer":{"type":"audioNode","id":"equalizer","active":{"name":"active","type":"boolean","default":true},"bands":{"name":"bands","type":"array","valueType":"band"},"":{"type":"audioNode"}},"lfo":{"type":{"name":"type","type":"enum","default":"SIN","values":["SIN","SQUARE","TRIANGLE","SAWTOOTH"],"automatable":false},"id":"lfo","active":{"name":"active","type":"boolean","default":true},"frequency":{"name":"frequency","type":"float","default":1,"min":0,"max":8,"automatable":false},"offset":{"name":"offset","type":"float","default":0.85,"min":0,"max":22050,"automatable":false},"phase":{"name":"phase","type":"float","default":0,"min":0,"max":6.28318530718,"automatable":false},"oscillation":{"name":"oscillation","type":"float","default":0.3,"min":-22050,"max":22050,"automatable":false},"":{"type":"audioNode"}},"phaser":{"type":"audioNode","id":"phaser","active":{"name":"active","type":"boolean","default":true},"rate":{"name":"rate","type":"float","default":1,"min":0,"max":8,"automatable":false},"depth":{"name":"depth","type":"float","default":0.3,"min":0,"max":1,"automatable":false},"feedback":{"name":"feedback","type":"float","default":0.2,"min":0,"max":1,"automatable":false},"stereoPhase":{"name":"stereoPhase","type":"int","default":30,"min":0,"max":180,"automatable":false},"baseModulationFrequency":{"name":"baseModulationFrequency","type":"float","default":700,"min":500,"max":1500,"automatable":false},"":{"type":"audioNode"}},"pingPongDelay":{"type":"audioNode","id":"pingPongDelay","active":{"name":"active","type":"boolean","default":true},"delayTime":{"name":"delayTime","type":"float","default":30,"min":0.0001,"max":10000,"automatable":false},"feedback":{"name":"feedback","type":"float","default":0.45,"min":0,"max":0.9,"automatable":true},"cutoff":{"name":"cutoff","type":"float","default":20,"min":20,"max":22050,"automatable":true},"dryLevel":{"name":"dryLevel","type":"float","default":1,"min":0,"max":1,"automatable":true},"wetLevel":{"name":"wetLevel","type":"float","default":1,"min":0,"max":1,"automatable":true},"tempoSync":{"name":"tempoSync","type":"string","automatable":false},"subdivision":{"name":"subdivision","type":"enum","default":"8D","values":["1","2D","2","2T","4D","4","4T","8D","8","8T","16D","16","16T","32D","32","32T"],"automatable":false},"":{"type":"audioNode"}},"tremolo":{"type":"audioNode","id":"tremolo","active":{"name":"active","type":"boolean","default":true},"intensity":{"name":"intensity","type":"float","default":0.3,"min":0,"max":1,"automatable":false},"stereoPhase":{"name":"stereoPhase","type":"int","default":0,"min":0,"max":180,"automatable":false},"rate":{"name":"rate","type":"float","default":0.1,"min":0.001,"max":8,"automatable":false},"":{"type":"audioNode"}},"wahWah":{"type":"audioNode","id":"wahWah","active":{"name":"active","type":"boolean","default":true},"automode":{"name":"automode","type":"boolean","default":false},"baseFrequency":{"name":"baseFrequency","type":"float","default":0.5,"min":0,"max":1,"automatable":false},"excursionOctaves":{"name":"excursionOctaves","type":"int","default":2,"min":1,"max":6,"automatable":false},"sweep":{"name":"sweep","type":"float","default":0.2,"min":0,"max":1,"automatable":false},"resonance":{"name":"resonance","type":"float","default":10,"min":1,"max":100,"automatable":false},"sensitivity":{"name":"sensitivity","type":"float","default":0.5,"min":-1,"max":1,"automatable":false},"":{"type":"audioNode"}}}}},"actions":[{"type":"audioRouter","id":"audioBus","triggers":["init_routing"],"actionProperties":{"instanceId":"master_bus","outputBus":"master","volume":0,"pan":0,"audioNodes":[]},"delay":0,"instanceId":""},{"type":"audioRouter","id":"audioBus","triggers":["init_routing"],"actionProperties":{"instanceId":"pause_bus","outputBus":"master_bus","volume":0,"pan":0,"audioNodes":[]},"delay":0,"instanceId":""},{"type":"parameterProcessor","id":"transform","triggers":["sound_off"],"actionProperties":{"instanceId":"master_mute","targetType":"audioRouter","targets":["master_bus"],"targetParameter":"volume","value":-80,"duration":100,"delay":0,"curve":0},"delay":0,"instanceId":""},{"type":"parameterProcessor","id":"transform","triggers":["sound_on"],"actionProperties":{"instanceId":"master_unmute","targetType":"audioRouter","targets":["master_bus"],"targetParameter":"volume","value":0,"duration":100,"delay":0,"curve":0},"delay":0,"instanceId":""},{"type":"parameterProcessor","id":"transform","triggers":["pause"],"actionProperties":{"instanceId":"pause_mute","targetType":"audioRouter","targets":["pause_bus"],"targetParameter":"volume","value":-80,"duration":100,"delay":0,"curve":0},"delay":0,"instanceId":""},{"type":"parameterProcessor","id":"transform","triggers":["unpause"],"actionProperties":{"instanceId":"pause_unmute","targetType":"audioRouter","targets":["pause_bus"],"targetParameter":"volume","value":0,"duration":100,"delay":0,"curve":0},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["init_routing"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"start","tempo":126,"beatsPerBar":16}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["splash_screen"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"bass_filter__1","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"dm_kraftwerk__1","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"stab__1","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"strings__1","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"synth_comp__1","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"synth_perc__1","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"synth_pop__1","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["gameover_screen"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"start","delay":0,"tempo":126,"beatsPerBar":16},{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"bass__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"bass_comp__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"bass_filter__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"dm_kraftwerk__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"lead_a__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"lead_b__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"stab__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"strings__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"synth_comp__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"synth_perc__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"synth_pop__2","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["info_screen"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"bass_filter__12","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"stab__12","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"},{"id":"add","patternId":"synth_pop__12","channel":"main","songPosition":"NEXT_BAR","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BAR"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["fog_over","multiball_over","death_ball_over","mirrored_controls_over","timebomb_over","ghost_ball_over"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_comp__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_filter__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"dm_kraftwerk__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_comp__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_perc__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_pop__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"}]},"delay":0,"instanceId":""},{"type":"eventProcessor","id":"eventMapper","triggers":["countdown_init"],"actionProperties":{"instanceId":"handle_long","eventMaps":[{"id":"eventMap","in":["countdown_init"],"out":"countdown_long_start","delay":500},{"id":"eventMap","in":["countdown_init"],"out":"stop_immediate","delay":0}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["stop_immediate"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"stop","songPosition":"ASAP"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["countdown_long_start"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"start","delay":0,"tempo":126,"beatsPerBar":16},{"id":"beatEvent","songPosition":"NEXT_BEAT+1.6","returnEvent":"gameplay_init","output":"onEvent"},{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_comp__5","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"stab__5","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_perc__5","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_plucked__5","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_sharp__5","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["gameplay_init"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_comp__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_filter__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"dm_kraftwerk__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_comp__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_perc__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_pop__4","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"FIRST_BEAT","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"}]},"delay":0,"instanceId":""},{"type":"eventProcessor","id":"eventMapper","triggers":["countdown_short"],"actionProperties":{"instanceId":"handle_short","eventMaps":[{"id":"eventMap","in":["countdown_short"],"out":"countdown_short_start","delay":3500},{"id":"eventMap","in":["countdown_short"],"out":"gameplay_init","delay":3500}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["user_won_round","user_lost_round"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"stop","songPosition":"ASAP"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["countdown_short_start"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"start","tempo":126,"beatsPerBar":16}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["fog_activate"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass__3","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_filter__3","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"dm_kraftwerk__3","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"stab__3","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_funk__3","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_perc__3","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_pop__3","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_sharp__3","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_warm__3","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["mirrored_controls_activate"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_comp__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_filter__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"dm_kraftwerk__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"lead_a__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"lead_b__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"stab__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_funk__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_plucked__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_sharp__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_warm__7","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["multiball_activate"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_comp__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_filter__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"dm_kraftwerk__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"stab__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_comp__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_funk__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_comp__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_plucked__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_pop__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_sharp__8","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["ghost_ball_activate"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass__9","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_comp__9","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_filter__9","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"dm_kraftwerk__9","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"stab__9","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_funk__9","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_plucked__9","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_pop__9","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_warm__9","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["timebomb_activate"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_filter__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"dm_kraftwerk__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"stab__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_comp__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_perc__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_plucked__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_pop__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_sharp__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_warm__10","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"}]},"delay":0,"instanceId":""},{"type":"player","id":"beatPatternPlayer","triggers":["death_ball_activate"],"actionProperties":{"instanceId":"main","flowItems":[{"id":"add","patternId":"empty_pattern","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":true,"replaceActive":true,"setAsCurrent":true,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass__11","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"bass_filter__11","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"dm_kraftwerk__11","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"lead_a__11","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"},{"id":"add","patternId":"synth_pop__11","channel":"main","songPosition":"NEXT_BEAT","patternPosition":"SYNC","clearPending":false,"replaceActive":false,"setAsCurrent":false,"loop":true,"loopLength":128,"clearPosition":"NEXT_BEAT"}]},"delay":0,"instanceId":""},{"type":"customCode","id":"customCode","triggers":["init_routing","user_won_round","user_lost_round","user_won_match","user_lost_match"],"actionProperties":{"instanceId":"LevelTransposer"},"delay":0,"instanceId":""},{"type":"midiProcessor","id":"midiProcessor","triggers":["item_up","item_down","paddle_fx","extra_life","winloose_tone","shield_hit","bass_filter","lead_a","lead_b","strings","synth_funk","synth_plucked","synth_sharp","synth_warm","bass","bass_comp","stab","synth_comp","synth_perc","synth_pop"],"actionProperties":{"instanceId":"midi_transposer","_dynamicValues":[{"key":"transpose","string":"customCode:LevelTransposer:transposeValue"}],"transpose":0,"dynamic":0,"quantize":"","scale":"","root":"","customScale":""},"delay":0,"instanceId":""},{"type":"sound","id":"genericPlay","triggers":["user_won_round"],"actionProperties":{"delay":0,"instanceId":"win_round_buzz","soundFile":"win_round_buzz","volume":0,"loop":-1,"reTrig":-1,"returnEvent":"","returnEventTime":0,"preListen":0,"bus":"pause_bus","timingCorrection":"PLAY","multiSuffix":"","pan":0,"priority":false},"delay":0,"instanceId":""},{"type":"sound","id":"genericPlay","triggers":["user_lost_round"],"actionProperties":{"delay":0,"instanceId":"loose_round_buzz","soundFile":"loose_round_buzz","volume":0,"loop":-1,"reTrig":-1,"returnEvent":"","returnEventTime":0,"preListen":0,"bus":"pause_bus","timingCorrection":"PLAY","multiSuffix":"","pan":0,"priority":false},"delay":0,"instanceId":""},{"type":"sound","id":"genericPlay","triggers":["user_lost_round"],"actionProperties":{"delay":0,"instanceId":"loose_fanfare","soundFile":"loose_fanfare","volume":0,"loop":-1,"reTrig":-1,"returnEvent":"","returnEventTime":0,"preListen":0,"bus":"pause_bus","timingCorrection":"PLAY","multiSuffix":"","pan":0,"priority":false},"delay":0,"instanceId":""},{"type":"sound","id":"genericPlay","triggers":["user_won_round"],"actionProperties":{"delay":0,"instanceId":"win_fanfare","soundFile":"win_fanfare","volume":0,"loop":-1,"reTrig":-1,"returnEvent":"","returnEventTime":0,"preListen":0,"bus":"pause_bus","timingCorrection":"PLAY","multiSuffix":"","pan":0,"priority":false},"delay":0,"instanceId":""},{"type":"sound","id":"genericPlay","triggers":["opponent_screen_explode"],"actionProperties":{"delay":0,"instanceId":"opponent_screen_break_between_levels","soundFile":"opponent_screen_break_between_levels","volume":0,"loop":-1,"reTrig":-1,"returnEvent":"","returnEventTime":0,"preListen":0,"bus":"pause_bus","timingCorrection":"PLAY","multiSuffix":"","pan":0,"priority":false},"delay":0,"instanceId":""},{"type":"midiProcessor","id":"makeNote","triggers":["mirrored_controls_activate","mirrored_controls_spawn","fireball_activate","fireball_spawn","bulletproof_activate","bulletproof_spawn","multiball_activate","multiball_spawn","timebomb_activate","timebomb_spawn","ghost_ball_activate","ghost_ball_spawn","death_ball_activate","death_ball_spawn","extra_life_activate","user_paddle_hit","opponent_paddle_hit","wall_hit","obstacle_hit","user_shield_hit","opponent_shield_hit","opponent_score_hit","fog_spawn","fog_activate"],"actionProperties":{"instanceId":"makeFx","noteMaps":[{"id":"noteMap","triggerIn":"extra_life_activate","triggerOut":"extra_life","note":"E1","velocity":127},{"id":"noteMap","triggerIn":"user_paddle_hit","triggerOut":"paddle_fx","note":"E1","velocity":127},{"id":"noteMap","triggerIn":"opponent_paddle_hit","triggerOut":"paddle_fx","note":"E2","velocity":127},{"id":"noteMap","triggerIn":"wall_hit","triggerOut":"paddle_fx","note":"B2","velocity":127},{"id":"noteMap","triggerIn":"obstacle_hit","triggerOut":"paddle_fx","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"opponent_shield_hit","triggerOut":"shield_hit","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"user_shield_hit","triggerOut":"shield_hit","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"opponent_score_hit","triggerOut":"winloose_tone","note":"E0","velocity":127},{"id":"noteMap","triggerIn":"fog_spawn","triggerOut":"item_up","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"fog_activate","triggerOut":"item_down","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"extra_life_spawn","triggerOut":"item_up","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"death_ball_spawn","triggerOut":"item_up","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"death_ball_activate","triggerOut":"item_down","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"ghost_ball_spawn","triggerOut":"item_up","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"ghost_ball_activate","triggerOut":"item_down","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"timebomb_spawn","triggerOut":"item_up","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"timebomb_activate","triggerOut":"item_down","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"multiball_spawn","triggerOut":"item_up","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"multiball_activate","triggerOut":"item_down","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"bulletproof_spawn","triggerOut":"item_up","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"bulletproof_activate","triggerOut":"item_down","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"fireball_spawn","triggerOut":"item_up","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"fireball_activate","triggerOut":"item_down","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"mirrored_controls_spawn","triggerOut":"item_up","note":"E3","velocity":127},{"id":"noteMap","triggerIn":"mirrored_controls_activate","triggerOut":"item_down","note":"E3","velocity":127}]},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["paddle_fx"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":1,"loop":false,"ampAttack":1,"ampDecay":450,"ampRelease":260,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"paddle_fx","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["extra_life"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":1,"loop":false,"ampAttack":1,"ampDecay":450,"ampRelease":260,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"extralife","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["winloose_tone"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":1,"loop":false,"ampAttack":1,"ampDecay":450,"ampRelease":260,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"winloose_tone","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["shield_hit"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":1,"loop":false,"ampAttack":1,"ampDecay":450,"ampRelease":260,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"Shield_Hit","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["item_up"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":1,"loop":false,"ampAttack":1,"ampDecay":450,"ampRelease":260,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"Item_Up","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["item_down"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":1,"loop":false,"ampAttack":1,"ampDecay":450,"ampRelease":260,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"Item_Down","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"parameterProcessor","id":"transform","triggers":["bass_filter_mute","lead_a_mute","lead_b_mute","strings_mute","synth_funk_mute","synth_plucked_mute","synth_sharp_mute","synth_warm_mute","dm_kraftwerk_mute","bass_mute","bass_comp_mute","stab_mute","synth_comp_mute","synth_perc_mute","synth_pop_mute"],"actionProperties":{"instanceId":"muteInst","targetType":"synth","targets":["multi"],"targetParameter":"volume","multiSuffix":"_mute","value":-80,"duration":100,"delay":0,"curve":0},"delay":0,"instanceId":""},{"type":"parameterProcessor","id":"transform","triggers":["bass_filter_unmute","lead_a_unmute","lead_b_unmute","strings_unmute","synth_funk_unmute","synth_plucked_unmute","synth_sharp_unmute","synth_warm_unmute","dm_kraftwerk_unmute","bass_unmute","bass_comp_unmute","stab_unmute","synth_comp_unmute","synth_perc_unmute","synth_pop_unmute"],"actionProperties":{"instanceId":"unmuteInst","targetType":"synth","targets":["multi"],"targetParameter":"volume","multiSuffix":"_unmute","value":-5,"duration":100,"delay":0,"curve":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["bass_filter"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":1,"loop":false,"ampAttack":1,"ampDecay":450,"ampRelease":260,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"bass_filter_low","velocityLow":0,"velocityHigh":50},{"id":"sampleMap","name":"bass_filter_mid","velocityLow":51,"velocityHigh":100},{"id":"sampleMap","name":"bass_filter_hi","velocityLow":101,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["bass_comp"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-2,"loop":false,"ampAttack":10,"ampDecay":450,"ampRelease":500,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["bass"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-2,"loop":false,"ampAttack":1,"ampDecay":1,"ampRelease":220,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["stab"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-4.5,"loop":false,"ampAttack":1,"ampDecay":50,"ampRelease":100,"ampSustain":1,"ampVelocityRatio":0,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["strings"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-6,"loop":false,"ampAttack":1,"ampDecay":1,"ampRelease":220,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["synth_comp"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-3.5,"loop":false,"ampAttack":1,"ampDecay":1,"ampRelease":1,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["synth_funk"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-5.5,"loop":false,"ampAttack":1,"ampDecay":200,"ampRelease":300,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["synth_perc"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-13,"loop":false,"ampAttack":1,"ampDecay":1,"ampRelease":1,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["synth_plucked"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":0,"loop":false,"ampAttack":1,"ampDecay":1,"ampRelease":45,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["synth_pop"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-2,"loop":false,"ampAttack":1,"ampDecay":1,"ampRelease":50,"ampSustain":1,"ampVelocityRatio":0,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["synth_sharp"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-7.5,"loop":false,"ampAttack":1,"ampDecay":1,"ampRelease":100,"ampSustain":1,"ampVelocityRatio":0,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["synth_warm"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-13,"loop":false,"ampAttack":1,"ampDecay":1,"ampRelease":500,"ampSustain":1,"ampVelocityRatio":0,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["lead_a"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":true,"bus":"pause_bus","volume":-8,"loop":false,"ampAttack":1,"ampDecay":350,"ampRelease":550,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["lead_b"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":true,"bus":"pause_bus","volume":-9,"loop":false,"ampAttack":1,"ampDecay":100,"ampRelease":640,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"synth","id":"sampler","triggers":["dm_kraftwerk"],"actionProperties":{"instanceId":"multi","ignoreNoteOff":false,"bus":"pause_bus","volume":-3,"loop":false,"ampAttack":1,"ampDecay":40,"ampRelease":100,"ampSustain":1,"ampVelocityRatio":1,"filterOn":false,"audioNodes":[],"sampleMapGroups":[{"id":"sampleMapGroup","name":"map1","sampleMaps":[{"id":"sampleMap","name":"multi","velocityLow":0,"velocityHigh":127}]}],"filterAttack":0,"filterDecay":0,"filterRelease":0,"filterSustain":1,"filterVelocityRatio":1,"filterQ":0.0001,"filterFrequency":0,"filterGain":0},"delay":0,"instanceId":""},{"type":"assetController","id":"loadMIDI","triggers":["preload_assets"],"actionProperties":{"instanceId":"midiLoader","returnEvent":"","files":[{"id":"file","type":"beatPattern","name":"countdown_init"},{"id":"file","type":"beatPattern","name":"countdown_short"},{"id":"file","type":"beatPattern","name":"deathball_activate"},{"id":"file","type":"beatPattern","name":"doubleball_activate"},{"id":"file","type":"beatPattern","name":"fog_activate"},{"id":"file","type":"beatPattern","name":"gameover_screen"},{"id":"file","type":"beatPattern","name":"ghostball_activate"},{"id":"file","type":"beatPattern","name":"info_screen"},{"id":"file","type":"beatPattern","name":"level_n"},{"id":"file","type":"beatPattern","name":"mirrored_controls_activate"},{"id":"file","type":"beatPattern","name":"opponent_score_hit"},{"id":"file","type":"beatPattern","name":"splash_screen"},{"id":"file","type":"beatPattern","name":"timebomb_activate"},{"id":"file","type":"beatPattern","name":"user_score_hit"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSampleMap","triggers":["preload_assets"],"actionProperties":{"instanceId":"load_sampleMaps","returnEvent":"","files":[{"id":"file","name":"samplemaps"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["dmaf_ready"],"actionProperties":{"instanceId":"load_fx","returnEvent":"","files":[{"id":"file","name":"Item_Up_E3"},{"id":"file","name":"Item_Down_E3"},{"id":"file","name":"PaddleFX_E0"},{"id":"file","name":"PaddleFX_G0"},{"id":"file","name":"PaddleFX_B0"},{"id":"file","name":"PaddleFX_E1"},{"id":"file","name":"PaddleFX_G1"},{"id":"file","name":"PaddleFX_B1"},{"id":"file","name":"PaddleFX_E2"},{"id":"file","name":"PaddleFX_G2"},{"id":"file","name":"PaddleFX_B2"},{"id":"file","name":"PaddleFX_E3"},{"id":"file","name":"PaddleFX_G3"},{"id":"file","name":"PaddleFX_B3"},{"id":"file","name":"ExtraLife_E1"},{"id":"file","name":"ExtraLife_B1"},{"id":"file","name":"ExtraLife_E2"},{"id":"file","name":"Loose_Perc"},{"id":"file","name":"Loose_E0"},{"id":"file","name":"Loose_B0"},{"id":"file","name":"Loose_E1"},{"id":"file","name":"Loose_B1"},{"id":"file","name":"Loose_E2"},{"id":"file","name":"Loose_B2"},{"id":"file","name":"Loose_E3"},{"id":"file","name":"Loose_B3"},{"id":"file","name":"Loose_E4"},{"id":"file","name":"Loose_B4"},{"id":"file","name":"Loose_E5"},{"id":"file","name":"Loose_B5"},{"id":"file","name":"Shield_Hit_E3"},{"id":"file","name":"Shield_Hit_B3"},{"id":"file","name":"Shield_Hit_E4"},{"id":"file","name":"Shield_Hit_B4"},{"id":"file","name":"loose_fanfare"},{"id":"file","name":"loose_round_buzz"},{"id":"file","name":"opponent_screen_break_between_levels"},{"id":"file","name":"win_fanfare"},{"id":"file","name":"win_round_buzz"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["dmaf_ready"],"actionProperties":{"instanceId":"load_bass_comp","returnEvent":"","files":[{"id":"file","name":"Bass_Comp_E-1"},{"id":"file","name":"Bass_Comp_As-1"},{"id":"file","name":"Bass_Comp_E0"},{"id":"file","name":"Bass_Comp_As0"},{"id":"file","name":"Bass_Comp_E1"},{"id":"file","name":"Bass_Comp_As1"},{"id":"file","name":"Bass_Comp_E2"},{"id":"file","name":"Bass_Comp_As2"},{"id":"file","name":"Bass_Comp_E3"},{"id":"file","name":"Bass_Comp_As3"},{"id":"file","name":"Bass_Comp_E4"},{"id":"file","name":"Bass_Comp_As4"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["preload_assets"],"actionProperties":{"instanceId":"load_bass","returnEvent":"","files":[{"id":"file","name":"Bass_E0"},{"id":"file","name":"Bass_As0"},{"id":"file","name":"Bass_E1"},{"id":"file","name":"Bass_As1"},{"id":"file","name":"Bass_E2"},{"id":"file","name":"Bass_As2"},{"id":"file","name":"Bass_E3"},{"id":"file","name":"Bass_As3"},{"id":"file","name":"Bass_E4"},{"id":"file","name":"Bass_As4"},{"id":"file","name":"Bass_E5"},{"id":"file","name":"Bass_As5"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["preload_assets"],"actionProperties":{"instanceId":"load_stab","returnEvent":"","files":[{"id":"file","name":"Stab_E0"},{"id":"file","name":"Stab_As0"},{"id":"file","name":"Stab_E1"},{"id":"file","name":"Stab_As1"},{"id":"file","name":"Stab_E2"},{"id":"file","name":"Stab_As2"},{"id":"file","name":"Stab_E3"},{"id":"file","name":"Stab_As3"},{"id":"file","name":"Stab_E4"},{"id":"file","name":"Stab_As4"},{"id":"file","name":"Stab_E5"},{"id":"file","name":"Stab_As5"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["preload_assets"],"actionProperties":{"instanceId":"load_kraftwerk","returnEvent":"","files":[{"id":"file","name":"KICK"},{"id":"file","name":"SNARE"},{"id":"file","name":"Hitt_2"},{"id":"file","name":"hihat"},{"id":"file","name":"Tapp_L"},{"id":"file","name":"Tapp_R"},{"id":"file","name":"Battery_1"},{"id":"file","name":"Battery_2"},{"id":"file","name":"Battery_3"},{"id":"file","name":"Battery_4"},{"id":"file","name":"Battery_5"},{"id":"file","name":"Battery_6"},{"id":"file","name":"Battery_7"},{"id":"file","name":"Battery_8"},{"id":"file","name":"Battery_9"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["preload_assets"],"actionProperties":{"instanceId":"load_synth_perc","returnEvent":"","files":[{"id":"file","name":"Synth_Perc_E0"},{"id":"file","name":"Synth_Perc_As0"},{"id":"file","name":"Synth_Perc_E1"},{"id":"file","name":"Synth_Perc_As1"},{"id":"file","name":"Synth_Perc_E2"},{"id":"file","name":"Synth_Perc_As2"},{"id":"file","name":"Synth_Perc_E3"},{"id":"file","name":"Synth_Perc_As3"},{"id":"file","name":"Synth_Perc_E4"},{"id":"file","name":"Synth_Perc_As4"},{"id":"file","name":"Synth_Perc_E5"},{"id":"file","name":"Synth_Perc_As5"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["preload_assets"],"actionProperties":{"instanceId":"load_synth_pop","returnEvent":"","files":[{"id":"file","name":"Synth_Pop_E0"},{"id":"file","name":"Synth_Pop_As0"},{"id":"file","name":"Synth_Pop_E1"},{"id":"file","name":"Synth_Pop_As1"},{"id":"file","name":"Synth_Pop_E2"},{"id":"file","name":"Synth_Pop_As2"},{"id":"file","name":"Synth_Pop_E3"},{"id":"file","name":"Synth_Pop_As3"},{"id":"file","name":"Synth_Pop_E4"},{"id":"file","name":"Synth_Pop_As4"},{"id":"file","name":"Synth_Pop_E5"},{"id":"file","name":"Synth_Pop_As5"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["preload_assets"],"actionProperties":{"instanceId":"load_synth_comp","returnEvent":"","files":[{"id":"file","name":"Synth_Comp_E0"},{"id":"file","name":"Synth_Comp_As0"},{"id":"file","name":"Synth_Comp_E1"},{"id":"file","name":"Synth_Comp_As1"},{"id":"file","name":"Synth_Comp_E2"},{"id":"file","name":"Synth_Comp_As2"},{"id":"file","name":"Synth_Comp_E3"},{"id":"file","name":"Synth_Comp_As3"},{"id":"file","name":"Synth_Comp_E4"},{"id":"file","name":"Synth_Comp_As4"},{"id":"file","name":"Synth_Comp_E5"},{"id":"file","name":"Synth_Comp_As5"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["preload_assets"],"actionProperties":{"instanceId":"load_strings","returnEvent":"","files":[{"id":"file","name":"Strings_E0"},{"id":"file","name":"Strings_As0"},{"id":"file","name":"Strings_E1"},{"id":"file","name":"Strings_As1"},{"id":"file","name":"Strings_E2"},{"id":"file","name":"Strings_As2"},{"id":"file","name":"Strings_E3"},{"id":"file","name":"Strings_As3"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["dmaf_ready"],"actionProperties":{"instanceId":"load_synth_plucked","returnEvent":"","files":[{"id":"file","name":"Synth_Plucked_E0"},{"id":"file","name":"Synth_Plucked_As0"},{"id":"file","name":"Synth_Plucked_E1"},{"id":"file","name":"Synth_Plucked_As1"},{"id":"file","name":"Synth_Plucked_E2"},{"id":"file","name":"Synth_Plucked_As2"},{"id":"file","name":"Synth_Plucked_E3"},{"id":"file","name":"Synth_Plucked_As3"},{"id":"file","name":"Synth_Plucked_E4"},{"id":"file","name":"Synth_Plucked_As4"},{"id":"file","name":"Synth_Plucked_E5"},{"id":"file","name":"Synth_Plucked_As5"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["dmaf_ready"],"actionProperties":{"instanceId":"load_synth_sharp","returnEvent":"","files":[{"id":"file","name":"Synth_Sharp_E1"},{"id":"file","name":"Synth_Sharp_As1"},{"id":"file","name":"Synth_Sharp_E2"},{"id":"file","name":"Synth_Sharp_As2"},{"id":"file","name":"Synth_Sharp_E3"},{"id":"file","name":"Synth_Sharp_As3"},{"id":"file","name":"Synth_Sharp_E4"},{"id":"file","name":"Synth_Sharp_As4"},{"id":"file","name":"Synth_Sharp_E5"},{"id":"file","name":"Synth_Sharp_As5"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["dmaf_ready"],"actionProperties":{"instanceId":"load_synth_funk","returnEvent":"","files":[{"id":"file","name":"Synth_Funk_E0"},{"id":"file","name":"Synth_Funk_As0"},{"id":"file","name":"Synth_Funk_E1"},{"id":"file","name":"Synth_Funk_As1"},{"id":"file","name":"Synth_Funk_E2"},{"id":"file","name":"Synth_Funk_As2"},{"id":"file","name":"Synth_Funk_E3"},{"id":"file","name":"Synth_Funk_As3"},{"id":"file","name":"Synth_Funk_E4"},{"id":"file","name":"Synth_Funk_As4"},{"id":"file","name":"Synth_Funk_E5"},{"id":"file","name":"Synth_Funk_As5"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["dmaf_ready"],"actionProperties":{"instanceId":"load_synth_warm","returnEvent":"","files":[{"id":"file","name":"Synth_Warm_E0"},{"id":"file","name":"Synth_Warm_As0"},{"id":"file","name":"Synth_Warm_E1"},{"id":"file","name":"Synth_Warm_As1"},{"id":"file","name":"Synth_Warm_E2"},{"id":"file","name":"Synth_Warm_As2"},{"id":"file","name":"Synth_Warm_E3"},{"id":"file","name":"Synth_Warm_As3"},{"id":"file","name":"Synth_Warm_E4"},{"id":"file","name":"Synth_Warm_As4"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["dmaf_ready"],"actionProperties":{"instanceId":"load_lead_a","returnEvent":"","files":[{"id":"file","name":"Lead_A_E1"},{"id":"file","name":"Lead_A_As1"},{"id":"file","name":"Lead_A_E2"},{"id":"file","name":"Lead_A_As2"},{"id":"file","name":"Lead_A_E3"},{"id":"file","name":"Lead_A_As3"},{"id":"file","name":"Lead_A_E4"},{"id":"file","name":"Lead_A_As4"},{"id":"file","name":"Lead_A_E5"},{"id":"file","name":"Lead_A_As5"},{"id":"file","name":"Lead_A_E6"},{"id":"file","name":"Lead_A_As6"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["dmaf_ready"],"actionProperties":{"instanceId":"load_lead_b","returnEvent":"","files":[{"id":"file","name":"Lead_B_E1"},{"id":"file","name":"Lead_B_As1"},{"id":"file","name":"Lead_B_E2"},{"id":"file","name":"Lead_B_As2"},{"id":"file","name":"Lead_B_E3"},{"id":"file","name":"Lead_B_As3"},{"id":"file","name":"Lead_B_E4"},{"id":"file","name":"Lead_B_As4"},{"id":"file","name":"Lead_B_E5"},{"id":"file","name":"Lead_B_As5"},{"id":"file","name":"Lead_B_E6"},{"id":"file","name":"Lead_B_As6"}]},"delay":0,"instanceId":""},{"type":"assetController","id":"loadSound","triggers":["preload_assets"],"actionProperties":{"instanceId":"load_bass_filter","returnEvent":"","files":[{"id":"file","name":"Bass_Filter_Low_E2"},{"id":"file","name":"Bass_Filter_Low_As2"},{"id":"file","name":"Bass_Filter_Low_E3"},{"id":"file","name":"Bass_Filter_Low_As3"},{"id":"file","name":"Bass_Filter_Low_E4"},{"id":"file","name":"Bass_Filter_Low_As4"},{"id":"file","name":"Bass_Filter_Low_E5"},{"id":"file","name":"Bass_Filter_Low_As5"},{"id":"file","name":"Bass_Filter_Low_E6"},{"id":"file","name":"Bass_Filter_Low_As6"},{"id":"file","name":"Bass_Filter_Mid_E2"},{"id":"file","name":"Bass_Filter_Mid_As2"},{"id":"file","name":"Bass_Filter_Mid_E3"},{"id":"file","name":"Bass_Filter_Mid_As3"},{"id":"file","name":"Bass_Filter_Mid_E4"},{"id":"file","name":"Bass_Filter_Mid_As4"},{"id":"file","name":"Bass_Filter_Mid_E5"},{"id":"file","name":"Bass_Filter_Mid_As5"},{"id":"file","name":"Bass_Filter_Mid_E6"},{"id":"file","name":"Bass_Filter_Mid_As6"},{"id":"file","name":"Bass_Filter_Hi_E2"},{"id":"file","name":"Bass_Filter_Hi_As2"},{"id":"file","name":"Bass_Filter_Hi_E3"},{"id":"file","name":"Bass_Filter_Hi_As3"},{"id":"file","name":"Bass_Filter_Hi_E4"},{"id":"file","name":"Bass_Filter_Hi_As4"},{"id":"file","name":"Bass_Filter_Hi_E5"},{"id":"file","name":"Bass_Filter_Hi_As5"},{"id":"file","name":"Bass_Filter_Hi_E6"},{"id":"file","name":"Bass_Filter_Hi_As6"}]},"delay":0,"instanceId":""}],"assetsPath":"./dmaf_assets/"};});
dmaf.once("load_modules", function (DMAF) {
    var type = "assetController",
        typeToPath = {
            "loadSampleMap": "xml/",
            "loadMIDI": "midi/",
            "loadSound": "audio/",
            "loadCustomCode": "js/"
        },
        Super = Object.create(DMAF.InstancePrototype, {
            init: {
                value: function () {
                    this.loadCount = 0;
                }
            },
            onload: {
                value: function () {
                    if (this.returnEvent) {
                        DMAF.dispatch(this.returnEvent);
                    }
                    DMAF[this.type][this.id].removeInstance(this.instanceId);
                }
            },
            onstep: {
                value: function () {
                    var percent = 100 - Math.floor((--Assets.loadsInProgress / Assets.loadTotals[this.task]) * 100);
                    if (percent !== Assets.loadPercents[this.task]) {
                        DMAF.dispatch("progress_event", percent, this.fileNames[this.loadCount] + this.format);
                        Assets.loadPercents[this.task] = percent;
                    }
                    if (++this.loadCount === this.fileNames.length) {
                        this.onload();
                    }
                }
            },
            onAction: {
                value: function (trigger) {
                    if (this.inProgress) {
                        return; //Prevent loader from firing more than once.
                    }
                    var baseURL = DMAF.Settings.assetsPath + typeToPath[this.id];
                    Assets.listenForLoads(trigger);
                    this.task = trigger;
                    this.fileNames = this.files.map(fixFilesArray);
                    Assets.loadsInProgress += this.fileNames.length;
                    this.inProgress = true;
                    for (var i = 0, ii = this.fileNames.length; i < ii; i++) {
                        this.loadFile(baseURL + this.fileNames[i] + this.format, this.fileNames[i], i);
                    }
                }
            }
        }),
        Assets = {
            beatPattern: {},
            sampleMap: {},
            buffer: {},
            timePattern: {},
            loadsInProgress: 0,
            loadTotals: {},
            loadPercents: {},
            listenForLoads: function (trigger) {
                if (this.loadTotals[trigger] !== undefined) return;
                var loads = DMAF.ActionManager.triggers[trigger];
                if (!loads.length) return;
                loads = loads.slice(0).filter(function (el) {
                    el.type = type;
                    return type;
                });
                this.loadTotals[trigger] = 0;
                this.loadPercents[trigger] = 0;
                for (var i = 0, ii = loads.length; i < ii; i++) {
                    this.loadTotals[trigger] += loads[i].actionProperties.files.length;
                }
            }
        };
    DMAF.Assets = Assets;
    DMAF.getAsset = function (type, id) {
        if (Assets[type] && Assets[type][id]) {
            return Assets[type][id];
        } else {
            if (dmaf.log) console.log("DMAF.getAsset: Couldn't find asset", type, id);
            return null;
        }
    };
    DMAF.setAsset = function (type, id, asset) {
        Assets[type] = Assets[type] || {};
        Assets[type][id] = asset;
    };

    function LoadCustomCode () {}
    LoadCustomCode.prototype = Object.create(Super, {
        format: {value: ".js"},
        loadFile: {
            value: function (path, name, index) {
                var loader = this,
                    elem = document.createElement("script");
                elem.type = "text/javascript";
                elem.src = path;
                elem.addEventListener("load", function () {
                    DMAF.dispatch("load_custom", DMAF);
                    loader.onstep();
                    if (elem.remove !== undefined) {
                        elem.remove();
                    }
                });
                document.body.appendChild(elem);
            }
        }
    });
    DMAF.registerInstance(type, "loadCustomCode", LoadCustomCode);

    function LoadSampleMap () {}
    LoadSampleMap.prototype = Object.create(Super, {
        format: {
            value: ".xml"
        },
        loadFile: {
            value: function (path, name, index) {
                var options = {
                    chain: [this.onstep],
                    context: this,
                    responseXML: true,
                    fail: function () {
                        if (dmaf.log) console.log("Problem parsing samplemap file");
                        this.onstep();
                    }
                };
                function sampleMapXMLSuccess (response) {
                    DMAF.parse("samplemap", response);
                }
                DMAF.Utils.ajax(path, sampleMapXMLSuccess, options);
            }
        }
    });
    DMAF.registerInstance(type, "loadSampleMap", LoadSampleMap);

    function LoadMIDI () {}
    LoadMIDI.prototype = Object.create(Super, {
        format: {
            value: ".mid"
        },
        loadFile: {
            value: function (path, name, index) {
                var midiAjaxOpt = {
                        override: "text/plain; charset=x-user-defined",
                        expectType: "string",
                        context: this,
                        fail: function () {
                            if (dmaf.log) console.log("Problem parsing midi file", path);
                            this.onstep();
                        }.bind(this)
                    };
                function midixmlsuccess (response) {
                    DMAF.parse("midi", response, this.files[index].type, name);
                    this.onstep();
                }
                DMAF.Utils.ajax(path, midixmlsuccess, midiAjaxOpt);
            }
        }
    });
    DMAF.registerInstance(type, "loadMIDI", LoadMIDI);

    function LoadSound () {}
    LoadSound.prototype = Object.create(Super, {
        loadFile: {
            value: function (url, name) {
                var ajaxOptions = {
                    responseType: "arraybuffer",
                    fail: fail.bind(this)
                },
                ondecode = function (buffer) {
                    Assets.buffer[name] = buffer;
                    this.onstep();
                }.bind(this),
                decodeError = function (e) {
                    if (dmaf.log) console.log("Could not decode file", name, e);
                    this.onstep();
                }.bind(this),
                tries = 0;

                function success (arraybuffer) {
                    if (tries > 0) if (dmaf.log) console.log("Retry success", name);
                    DMAF.context.decodeAudioData(arraybuffer, ondecode, decodeError);
                }
                function fail () {
                    if (++tries < 3) {
                        if (dmaf.log) console.log("Could not load audio file", name, "trying again.");
                        DMAF.Utils.ajax(url, success, ajaxOptions, "buffer");
                    } else {
                        if (dmaf.log) console.log("Could not load audio file", name);
                        this.onstep();
                    }
                }
                DMAF.Utils.ajax(url, success, ajaxOptions, "buffer");
            }
        },
        format: {
            value: DMAF.fileFormat
        }
    });
    DMAF.registerInstance(type, "loadSound", LoadSound);
    //Corrects file array from list of objects to strings
    function fixFilesArray (item) {
        return item.name;
    }
    function onerror (e) {
        console.error("DMAF error Loading Asset ", e);
    }
});
dmaf.once("load_modules", function (DMAF) {
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
    DMAF.registerInstance(type, "audioBus", AudioBus);
});
dmaf.once("load_modules", function (DMAF) {
    var type = "customCode",
        Super = DMAF.InstancePrototype;
    function CustomCode () {}
    CustomCode.prototype = Object.create(Super);
    DMAF.registerInstance("customCode", "customCode", CustomCode);
    DMAF.customCode.customCode.createInstance = function (properties) {
        if (DMAF.customCode[properties.instanceId]) {
            var instance = DMAF.customCode[properties.instanceId].createInstance(properties);
            return instance;
        } else {
            if (dmaf.log) console.log(properties.instanceId, "was not registered with DMAF");
        }
    };

    function UserObject () {}
    UserObject.prototype = Object.create(Super, {
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                var obj = DMAF.pendingObjects[this.instanceId];
                if (obj) {
                    this.obj = obj;
                }
            }
        }
    });
    DMAF.registerInstance("customCode", "userObject", UserObject);
});
dmaf.once("load_modules", function (DMAF) {
    var type = "eventProcessor",
        Super = DMAF.InstancePrototype;

    function EventMapper () {}
    EventMapper.prototype = Object.create(Super, {
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties)  {
                var delay;
                for (var i = 0, ii = this.eventMaps.length; i < ii; i++) {
                    if (this.eventMaps[i]["in"].indexOf(trigger) !== -1) {
                        if (trigger === this.eventMaps[i].out) {
                            if (dmaf.log) console.log("DMAF.EventMapper: ", trigger, " is the same in event as output. Ignoring...");
                            continue;
                        }
                        delay = this.eventMaps[i].delay || 0;
                        DMAF.Clock.checkFunctionTime(
                            actionTime + delay + DMAF.preListen,
                            DMAF.ActionManager.onEvent,
                            [],
                            DMAF.ActionManager,
                            this.eventMaps[i].out,
                            actionTime + delay + DMAF.preListen,
                            eventProperties
                        );
                    } else if (this.eventMaps[i]["in"][0] === "multi") {
                        delay = this.eventMaps[i].delay || 0;
                        DMAF.Clock.checkFunctionTime(
                            actionTime + delay + DMAF.preListen,
                            DMAF.ActionManager.onEvent,
                            [],
                            DMAF.ActionManager,
                            this.eventMaps[i].out,
                            actionTime + delay + DMAF.preListen,
                            eventProperties
                        );
                    }
                }
                //DMAF.ActionManager.stop();
            }
        }
    });
    DMAF.registerInstance(type, "eventMapper", EventMapper);

    function MidiNoteMapper () {}
    MidiNoteMapper.prototype = Object.create(Super, {
        init: {
            value: function () {
                for (var i = 0, ii = this.eventMaps.length; i < ii; i++) {
                    this.eventMaps[i]["in"] = parseInt(this.eventMaps[i]["in"], 10);
                    if (isNaN(this.eventMaps[i]["in"])) {
                        if (dmaf.log) console.log("In value for MidiNoteMapper is NaN!");
                    }
                }
            }
        },
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                if (eventProperties && eventProperties.midiNote) {
                    for (var i = 0, ii = this.eventMaps.length; i < ii; i++) {
                        if (this.eventMaps[i]["in"] === eventProperties.midiNote) {
                            DMAF.ActionManager.onEvent(this.eventMaps[i].out, actionTime, eventProperties);
                        }
                    }

                }
            }
        }
    });
    DMAF.registerInstance(type, "midiNoteMapper", MidiNoteMapper);
});
dmaf.once("load_modules", function (DMAF) {
    var type = "mediaElement",
        Super = DMAF.InstancePrototype;

    function MediaElement () {}
    MediaElement.prototype = Object.create(Super, {
        currentTime: {
            get: function () {
                if (this.element) {
                    return this.element.currentTime;
                }
            },
            set: function () {
                if (dmaf.log) console.log("MediaElement currentTime is read-only");
            }
        },
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                if (this.element) return null;
                var id = this.instanceId,
                    element = DMAF.pendingObjects[id];
                if (!element) {
                    if (dmaf.log) console.log("DMAF Could not locate mediaElement with id", this.instanceId);
                } else {
                    if (element instanceof HTMLElement) {
                        if (element.tagName === "VIDEO" || element.tagName === "AUDIO") {
                            this.element = element;
                            this.playing = false;
                            this.lastPlayTime = element.currentTime;
                            DMAF.Clock.addFrameListener(this.type + ":" + this.instanceId, this.poll, this);
                        } else {
                            if (dmaf.log) console.log("DMAF does not support registering HTML elements other than <video> and <audio>");
                        }
                    }
                }
            }
        },
        poll: {
            value: function () {
                if (this.lastPlayTime === this.element.currentTime) {               //Element is stopped
                    if (this.playing) {
                        DMAF.ActionManager.onEvent(this.instanceId + ".STOP", DMAF.context.currentTime * 1000);
                        this.playing = false;
                    }
                } else if (this.lastPlayTime - this.element.currentTime > 0.25) {    //Element has skipped backward
                    DMAF.ActionManager.onEvent(this.instanceId + ".START", (DMAF.context.currentTime - this.currentTime) * 1000);
                } else if (this.element.currentTime - this.lastPlayTime > 0.25) {    //Element has skipped forward
                    DMAF.ActionManager.onEvent(this.instanceId + ".START", (DMAF.context.currentTime - this.currentTime) * 1000);
                } else {
                    if (!this.playing) {
                        DMAF.ActionManager.onEvent(this.instanceId + ".START", (DMAF.context.currentTime - this.currentTime) * 1000);
                        this.playing = true;
                    }
                }
                this.lastPlayTime = this.element.currentTime;
            }
        }
    });
    DMAF.registerInstance(type, "mediaElement", MediaElement);
    DMAF.mediaElement.mediaElement.removeInstance = function (instanceId) {
        var instance = DMAF.getInstance("mediaElement:" + instanceId);
        if (instance) {
            DMAF.Clock.removeFrameListener(type + ":" + instanceId);
        }
        return delete this.activeInstances[instanceId];
    };
    function MediaController () {}
    MediaController.prototype = Object.create(Super, {
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                var action = /CREATE|REMOVE/.exec(trigger),
                    instanceId;
                if (action.length) {
                    action = action[0].toLowerCase();
                    instanceId = trigger.split(".")[0];
                    this[action](actionTime, instanceId);
                }
            }
        },
        create: {
            value: function (actionTime, instanceId) {
                var instance = DMAF.mediaElement.mediaElement.createInstance(
                    {instanceId: instanceId, type: type, id: "mediaElement"});
                DMAF.Clock.checkFunctionTime(
                    actionTime,
                    instance.onAction,
                    [],
                    instance
                );
            }
        },
        remove: {
            value: function (actionTime, instanceId) {
                return DMAF.mediaElement.mediaElement.removeInstance(instanceId);
            }
        }
    });
    DMAF.registerInstance("control", "mediaController", MediaController, true);
});
dmaf.once("load_modules", function (DMAF) {
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
            mixolydian: [0, 1, 0, 1, 0, 0, -1, 0, -1, 0, -1],
            locrian: [0, 0, -1, 0, -1, 0, 0, -1, 0, -1, 0, -1],
            doubleHarmonic: [0, 0, -1, 1, 0, 0, 1, 0, 0, -1, 1, 0],
            halfDim: [0, 1, 0, 0, -1, 0, 0, -1, 0, -1, 0, -1],
            pentatonic: [0, -1, -2, 0, -1, 0, -1, 0, -1, -2, 0, -1]
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
                    if (dmaf.log) console.log("no eventProperties");
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
    DMAF.registerInstance(type, "midiProcessor", MidiProcessor);

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
    DMAF.registerInstance(type, "makeNote", MakeNote);
});
dmaf.once("load_modules", function (DMAF) {
    var type = "parameterProcessor",
        Super = DMAF.InstancePrototype;

    function Transform (properties) {
        this.timeoutContainer = [];
    }
    Transform.prototype = Object.create(Super, {
        onAction: {
            value: function (trigger, actionTime, eventProperties) {
                if (this.targets.length) {
                    if (this.targets[0] === "multi") {
                        this.targets = [trigger.replace(this.multiSuffix, "")];
                    }
                    DMAF.Clock.checkFunctionTime(this.actionTime, this.execute, this.timeoutContainer, this, actionTime);
                }
            }
        },
        execute: {
            value: function (actionTime) {
                var target;
                while (this.targets.length) {
                    target = DMAF.getInstance(this.targetType, this.targets.shift());
                    if (target) {
                        if (dmaf.log) console.log("Transforming", this.targetParameter, "of", target.instanceId);
                        target.setProperty(this.targetParameter, this.value, this.duration, actionTime);
                    }
                }
            }
        }
    });
    DMAF.registerInstance(type, "transform", Transform, true);

    function Macro () {}
    Macro.prototype = Object.create(Super, {
        onAction: {
            value: function (trigger, actionTime, eventProperties) {
                var target, value, instance;
                for (var i = 0, ii = this.targets.length; i < ii; i++) {
                    target = this.targets[i];
                    instance = DMAF.getInstance(target.targetType, target.targetId);
                    if (instance) {
                        value = target.min + (target.max - target.min) * this.value;
                        instance.setProperty(target.targetParameter, value, this.duration, actionTime);
                    }
                }
            }
        }
    });
    DMAF.registerInstance(type, "macro", Macro);
});
dmaf.once("load_modules", function (DMAF) {
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
                                if(this.state === this.RUNNING) {
                                    break;
                                }
                                if (flowItem.delay) {
                                    var startTime = flowItem.delay ? actionTime + flowItem.delay : actionTime;
                                    DMAF.Clock.checkFunctionTime(startTime, this.start, [], this, flowItem, startTime);
                                } else {
                                    this.start(flowItem, actionTime);
                                }
                                break;
                            case "add":
                                DMAF.Clock.checkFunctionTime(actionTime, this.addPattern, [], this, flowItem);
                                break;
                            case "stop":
                                if (this.state === this.STOPPED) {
                                    break;
                                }
                                DMAF.Clock.checkFunctionTime(actionTime, this.stop, [], this, flowItem);
                                break;
                            case "beatEvent":
                                DMAF.Clock.checkFunctionTime(actionTime, this.beatEvent, [], this, flowItem);
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
                    if (dmaf.log) console.log("BeatPatternPlayer: Cannot add pattern while player is not running.", properties.patternId);
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
                var BEAT = this.songPosition.beat;
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
                for (i = 0; i < this.activePatterns.length; i++) {
                    removePosition = this.activePatterns[i].removeAtSongPosition;
                    if(removePosition.bar === this.songPosition.bar && removePosition.beat === this.songPosition.beat) {
                        this.activePatterns.splice(i--, 1);
                    } else if(removePosition.bar < this.songPosition.bar) {
                        this.activePatterns.splice(i--, 1);
                    }
                }
            }
        },
        start: {
            value: function(flowItem, actionTime) {
                this.tempo = flowItem.tempo || 120;
                this.nextBeatTime = actionTime;
                this.beatsPerBar = flowItem.beatsPerBar;
                this.state = this.RUNNING;
                DMAF.Clock.addFrameListener("checkBeat", this.checkBeat, this);
            }
        },
        stop: {
            value: function(flowItem) {
                var position = this.getSongPosition(flowItem.songPosition).getInBeats(),
                    current = this.songPosition.getInBeats(),
                    time = (position - current) * this.beatLength;
                time += DMAF.context.currentTime * 1000;
                time = Math.max(DMAF.context.currentTime * 1000, time);
                DMAF.Clock.checkFunctionTime(time, this.proceedStop, [], this, flowItem);
            }
        },
        proceedStop: {
            value: function(flowItem) {
                this.state = this.STOPPED;
                this.pendingPatterns.length = 0;
                this.activePatterns.length = 0;
                DMAF.Clock.removeFrameListener("checkBeat");
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
                    if (dmaf.log) console.log("BeatPatternPlayer getSongPosition: Unrecognized songPosition ", mode);
                }
                position.bar += offsetBar;
                position.beat += offsetBeat;
                return position;
            }
        },
        getStartAtBeat: {
            value: function(string) {
                var mode = string,
                    offsetBeat = 0,
                    offsetBar = 0,
                    chain,
                    beat = this.currentPattern && this.currentPattern.currentBeat || 1;
                if(!mode) {
                    return 1;
                }
                if(/\+/.test(mode)) {
                    chain = mode.split("+");
                    mode = chain[0];
                    chain = chain[1].split(".");
                    offsetBar = parseInt(chain[0], 10) || 0;
                    offsetBeat = parseInt(chain[1], 10) || 0;
                }
                switch(mode) {
                case "FIRST_BEAT":
                    beat = 1;
                    break;
                case "SYNC":
                    beat++;
                    break;
                default:
                    if (dmaf.log) console.log("BeatPatternPlayer: Unrecognized patternPosition " + mode);
                }
                beat += offsetBar * (this.currentPattern && this.currentPattern.beatsPerBar || 16);
                beat += offsetBeat;
                return beat;
            }
        }
    });
    DMAF.registerInstance(type, "beatPatternPlayer", BeatPatternPlayer);

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
            if (dmaf.log) console.log("DMAF: Adjusting next beat Time. Difference was " + change + "ms");
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
                    if (dmaf.log) console.log("No time pattern with id ", patternId, "exists.");
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
                    if (dmaf.log) console.log("No time pattern with id ", patternId, "exists.");
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
    DMAF.registerInstance(type, "timePatternPlayer", TimePatternPlayer);
});
dmaf.once("load_modules", function (DMAF) {
    var type = "sound", UID = 0;
    var ctm = DMAF.Clock,
        Super = Object.create(DMAF.InstancePrototype, {
            init: {
                value: function (properties)  {
                    this.pendingPlays = [];
                    this.pendingStops = [];
                    this.pendingEvents = [];
                    this.pendingSoftLoop = [];
                    this.sounds = [];
                    this.playing = false;
                    this.previousActionTime = 0;
                    if (!properties.bus || properties.bus === "master") {
                        this.targetBus = DMAF.context.destination;
                    } else {
                        var bus = DMAF.getInstance("audioRouter", properties.bus);
                        this.targetBus = bus ? bus.input : DMAF.context.destination;
                    }
                    this.output.connect(this.targetBus);
                }
            },
            checkFinished: {
                value: function () {
                    this.sounds = this.sounds.filter(function (el) {
                        return el.playbackState !== 3;
                    });
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
                        if (dmaf.log) console.log("GenericPlay: Buffer is missing. Check soundFile property.");
                        return {buffer: {duration: -1},noteOn: function(){},noteGrainOn:function(){}};
                    }
                    sound.id = UID++;
                    sound.buffer = buffer;
                    sound.connect(this.output);
                    if (this.loop === -2) sound.loop = true;
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
                    this.checkFinished();
                    ctm.dropPendingArray(this.pendingStops);
                    if (this.playing) {
                        if (this.reTrig > -1) {
                            ctm.dropPendingArray(this.pendingPlays);
                            ctm.dropPendingArray(this.pendingEvents);
                        }
                        if (this.reTrig === 0 || this.timingCorrection === "RESYNC") {
                            if (dmaf.log) console.log("scheduling", this.instanceId, "for", actionTime);
                            ctm.checkFunctionTime(actionTime, this.proceedPlay, this.pendingPlays, this, actionTime);
                        } else {
                            if (this.reTrig > 0 && actionTime - this.previousActionTime > this.reTrig) {
                                this.previousActionTime = actionTime;
                                if (dmaf.log) console.log("scheduling", this.instanceId, "for", actionTime);
                                ctm.checkFunctionTime(actionTime, this.proceedPlay, this.pendingPlays, this, actionTime);
                            }
                        }
                    } else {
                        this.previousActionTime = actionTime;
                        if (dmaf.log) console.log("scheduling", this.instanceId, "for", actionTime);
                        ctm.checkFunctionTime(actionTime, this.proceedPlay, this.pendingPlays, this, actionTime);
                    }
                }
            },
            proceedPlay: {
                value: function (actionTime) {
                    if (dmaf.log) console.log("playing", this.instanceId, "at", ~~(DMAF.context.currentTime * 1000));
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
                    ctm.dropPendingArray(this.pendingEvents);
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
                        ctm.checkFunctionTime(loopTime, this.proceedPlay, this.pendingSoftLoop, this, loopTime);
                        ctm.checkFunctionTime(loopTime, this.dispose, [], this, sound.id);
                        sound.noteOff((actionTime / 1000) + sound.buffer.duration);
                    } if (this.loop === -2) {
                        //Is Hard loop
                    } else {
                        ctm.checkFunctionTime(actionTime + bufferLength, this.dispose, [], this, sound.id);
                    }
                    this.playing = true;
                    this.sounds.push(sound);
                }
            },
            stop: {
                value: function (actionTime) {
                    if (dmaf.log) console.log("scheduling stop", this.instanceId, "at", ~~(DMAF.context.currentTime * 1000));
                    ctm.dropPendingArray(this.pendingPlays);
                    ctm.dropPendingArray(this.pendingStops);
                    ctm.checkFunctionTime(actionTime, this.proceedStop, this.pendingStops, this);
                }
            },
            proceedStop: {
                value: function () {
                    if (dmaf.log) console.log("Stopping", this.instanceId, "at", ~~(DMAF.context.currentTime * 1000));
                    var i = this.sounds.length;
                    ctm.dropPendingArray(this.pendingEvents);
                    ctm.dropPendingArray(this.pendingSoftLoop);
                    this.clearAll();
                    DMAF.sound[this.id].removeInstance(this.instanceId);
                }
            },
            verify: {
                value: DMAF.Utils.verify
            },
            volume: {
                get: function () {
                    return this.output.gain;
                },
                set: function (value) {
                    this._volume = value;
                    this.waVolume = DMAF.Utils.dbToWAVolume(this._volume);
                    this.output.gain.value = this.waVolume;
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

    function GenericPlay () {
        this.output = DMAF.context.createGainNode();
    }
    GenericPlay.prototype = Object.create(Super, {
        getSoundFile: {
            value: function () {
                return this.soundFile;
            }
        }
    });
    DMAF.registerInstance(type, "genericPlay", GenericPlay);

    function StepPlay (properties) {
        this.iterator = new DMAF.Iterator(properties.soundFiles, properties.generator);
        this.output = DMAF.context.createGainNode();
    }
    StepPlay.prototype = Object.create(Super, {
        getSoundFile: {
            value: function () {
                return this.iterator.getNext();
            }
        }
    });
    DMAF.registerInstance(type, "stepPlay", StepPlay);

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
    DMAF.registerInstance(type, "soundStop", SoundStop, true);
});
dmaf.once("load_modules", function (DMAF) {
    var type = "stateProcessor",
        IN = "in",
        PREVIOUS = /PREVIOUS/;

    function State (properties) {
        this.value = undefined;
        this.previous = undefined;
    }
    State.prototype = Object.create(DMAF.InstancePrototype, {
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                var value, i, ii, j, jj;
                for (i = 0, ii = this.stateMaps.length; i < ii; i++) {
                    for (j = 0, jj = this.stateMaps[i][IN].length; j < jj; j++) {
                        if (this.stateMaps[i][IN][j] === trigger) {
                            value = this.stateMaps[i].state;
                            if (this.stateMaps[i]._dynamicValues) {
                                value = DMAF.getInstanceProperty(this.stateMaps[i]._dynamicValues[0].string);
                            }
                            i = ii; j = jj;
                        }
                    }
                }
                if (!value) {
                    if (dmaf.log) console.log("StateProcesor: No state found for", trigger);
                    return false;
                }
                if (PREVIOUS.test(value)) {
                    value = this.previous;
                }
                switch (this.update) {
                    case "always":
                        this.previous = this.value;
                        this.value = value;
                        break;
                    case "onChange":
                        if (value !== this.value) {
                            this.previous = this.value;
                            this.value = value;
                        }
                }
            }
        }
    });
    DMAF.registerInstance(type, "state", State);
});
dmaf.once("load_modules", function (DMAF) {
    var type = "synth",
        mToF = DMAF.Utils.MIDIToFrequency,
        toMidi = DMAF.Utils.toMIDINote,
        dbToWAV = DMAF.Utils.dbToWAVolume,
        Super = DMAF.InstancePrototype;

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
                var name;
                for (var i = 0, ii = properties.sampleMapGroups[0].sampleMaps.length; i < ii; i++) {
                    //Need to fix this
                    name = properties.sampleMapGroups[0].sampleMaps[i].name.toLowerCase();
                    name = name === "multi" ? this.instanceId.toLowerCase() : name.toLowerCase();
                    this.samples.meta[name] = properties.sampleMapGroups[0].sampleMaps[i];
                }
                for (var mapName in this.samples.meta) {
                    if (!DMAF.getAsset("sampleMap", mapName)) {
                        console.log("Could not find samplemap", mapName);
                    }
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
                    if (dmaf.log) console.log("Sampler does not recognize message ", eventProperties);
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
                if (eventProperties.midiNote === 36) {}
                //If not in range..
                if (range && range.sound) { //or sample is not loaded...
                    if (!DMAF.getAsset("buffer", range.sound)) {
                        //console.log("no buffer");
                        return;
                    }
                } else {
                    //console.log("could not find sample for note", midiNote);
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
                    if (dmaf.log) console.log("Sampler Configuration Error: You cannot use looped samples with ignoreNoteOff.");
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
                        active[array][i]._noteOff(DMAF.context.currentTime * 1000);
                    }
                    i = sustained.length;
                    while (i--) {
                        sustained[i]._noteOff(DMAF.context.currentTime * 1000);
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
                this.output.connect(DMAF.context.destination);
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
    function disposeCheck () {
        var currentTime = DMAF.context.currentTime,
            active = this.samples.active,
            sustained = this.samples.sustained,
            keys = Object.keys(active),
            i = keys.length, j, key;
        while (i--) {
            key = keys[i];
            j = active[key].length;
            while(j--) {
                if (active[key][j].disposeTime < currentTime) {
                    active[key].splice(j, 1);
                }
            }
        }
        i = sustained.length;
        while (i--) {
            if (sustained[i].disposeTime < currentTime) {
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
    DMAF.registerInstance(type, "sampler", Sampler);
});
dmaf.once("load_core", function load_Actions (DMAF) {
    var stop = false, preloads;
    DMAF.ActionManager = {
        triggers: {}, //just a thought - maybe we should call this actions, or actionTriggers? The actual content is actions, after all.. or maybe not.. or maybe...
        populate: function () {
            dmaf.active = false;
            for (var i = 0, ii = DMAF.Settings.actions.length; i < ii; i++) {
                addAction(DMAF.Settings.actions[i]);
            }
            if (dmaf.log) console.log("dmaf successfully loaded", ii, "actions.");
            preloads = DMAF.ActionManager.triggers.preload_assets;
            if (preloads && preloads.length) {
                if (dmaf.log) console.log("dmaf is now preloading", preloads.length, "assets");
                dmaf.addEventListener("progress_event", readyCheck);
                this.onEvent("preload_assets");
            } else {
                readyCheck(100);
            }
        },
        stop: function () {
            stop = true; //used by actions to stop execution of any other folowing events that belongs to the same trigger, right?
            //Yes.
        },
        onEvent: function (trigger, eventTime, eventProperties) {
            var actions = this.triggers[trigger],
                actionTime = eventTime || DMAF.context.currentTime * 1000,
                delay;
            stop = false;
            if (!actions || !actions.length) return;
            for (var i = 0, ii = actions.length; i < ii; i++) {
                delay = actions[i].delay ? actions[i].delay : 0;
                if (actions[i].actionProperties.delay) {
                    delay += actions[i].actionProperties.delay;
                }
                actions[i].execute(trigger, actionTime + delay, eventProperties);
                if (stop) break;
            }
        }
    };
    function readyCheck (percent) {
        if (percent === 100) {
            if (dmaf.log) console.log("dmaf has finished all preloads.");
            dmaf.removeEventListener("progress_event", readyCheck);
            DMAF.ActionManager.onEvent("init_routing");
            DMAF.ActionManager.onEvent("dmaf_ready");
            dmaf.active = true;
            if (dmaf.log) console.log("dispatching dmaf_ready");
            DMAF.dispatch("dmaf_ready");
            if (dmaf.log) console.log("dmaf is now active!");
        }
    }
    function addAction (data) {
        if (!DMAF[data.type] || !DMAF[data.type][data.id]) {
            if (dmaf.log) console.log("DMAF Could not find module of type", data.type, "with id", data.id,
                "check the config.xml to make sure you've included this module.");
            return;
        }
        var trigger, action = new Action(data);
        for (var i = 0, ii = action.triggers.length; i < ii; i++) {
            trigger = action.triggers[i];
            DMAF.ActionManager.triggers[trigger] = DMAF.ActionManager.triggers[trigger] || [];
            DMAF.ActionManager.triggers[trigger].push(action);
        }
    }
    function Action (data) {
        this.actionProperties = data.actionProperties;
        this.triggers = data.triggers;
        this.delay = data.delay || 0;
        this.type = data.type;
        this.id = data.id;
        this.multi = this.actionProperties.instanceId === "multi";
    }
    Action.prototype = {
        execute: function (trigger, actionTime, eventProperties) {
            var instance,
                instanceId,
                instanceProperties;

            instanceId = this.multi ? trigger : this.actionProperties.instanceId;
            instance = DMAF.getInstance(this.type, instanceId || "no_instance_id");
            if (!instance) {
                instanceProperties = DMAF.Utils.clone(this.actionProperties);
                instanceProperties.instanceId = instanceId;
                instanceProperties.type = this.type;
                instanceProperties.id = this.id;
                instance = DMAF[this.type][this.id].createInstance(instanceProperties);
            } else if (instance._dynamicValues) {
                instance.setDynamicValues();
            }
            if (instance) {
                instance.onAction(trigger, actionTime, eventProperties, this.actionProperties);
            } else {
                console.log(this);
            }
        }
    };
});
dmaf.once("load_core", function (DMAF) {
    var Clock = DMAF.Clock = {},
        slice = Array.prototype.slice,
        frameEvents = [],
        running = false,
        currentTime, lastTime, id, i,
        context = DMAF.context;

    DMAF.preListen = 70;
    DMAF.lastTime = 0;
    DMAF.currentTime = -1;

    function run () {
        if (!frameEvents.length) {
            running = false;
            return;
        }
        currentTime = context.currentTime * 1000;
        for (i = 0; i < frameEvents.length; i++) {
            frameEvents[i].callback.call(frameEvents[i].context);
        }
        DMAF.lastTime = DMAF.currentTime;
        DMAF.currentTime = DMAF.context.currentTime;
        if(DMAF.lastTime === DMAF.currentTime){
            console.error("Dirty context time!");
        }
        setTimeout(run, 30);
    }
    Clock.checkFunctionTime = function (actionTime, callback, pendingArray, context) {
        var args = slice.call(arguments, 4), timer, tID, fromNow;
        context = context || DMAF;
        if(actionTime >= DMAF.context.currentTime * 1000 + DMAF.preListen) {
            timer = function timer () {
                pendingArray.splice(pendingArray.indexOf(tID), 1);
                callback.apply(context, args);
            };
            fromNow = actionTime - Math.floor(DMAF.context.currentTime * 1000) - DMAF.preListen;
            tID = setTimeout(timer, fromNow);
            pendingArray.push(tID);
        } else {
            callback.apply(context, args);
        }
    };
    Clock.dropPendingArray = function (array) {
        while (array.length) {
            clearTimeout(array.pop());
        }
    };
    Clock.addFrameListener = function (id, callback, context) {
        if (checkDuplicate(id)) {
            if (dmaf.log) console.log("That frame listener is already running!", id);
            return;
        }
        frameEvents.push({
            callback: callback,
            context: context || DMAF,
            id: id
        });
        if (!running) {
            running = true;
            run();
        }
    };
    Clock.removeFrameListener = function (id) {
        var i = frameEvents.length;
        while(i--) {
            if(frameEvents[i].id === id) {
                frameEvents.splice(i, 1);
                return true;
            }
        }
        return false;
    };
    function checkDuplicate (id) {
        var i = frameEvents.length;
        while(i--) if(frameEvents[i].id === id) return true;
        return false;
    }
});
dmaf.once("load_core", function (DMAF) {
    var colon = /[:]/;
    DMAF.registerInstance = function (type, id, constructor, doNotManage) {
        DMAF[type] = DMAF[type] || Object.create(null); //is there an advantage in not using the object litteral here?
        DMAF[type].ids = DMAF[type].ids || [];
        DMAF[type].ids.push(id);
        constructor.prototype.defaults = DMAF.Settings.descriptors.action[type][id] || {};
        DMAF[type][id] = new InstanceType(constructor, doNotManage);
    };
    DMAF.getInstance = function (type, instanceId) {
        var keys, key, instance, i = 0;
        keys = DMAF[type].ids;
        for (;(key = keys[i++]);) {
            instance = this[type][key].getInstance(instanceId);
            if (instance) return instance;
        }
        return null;
    };
    DMAF.getInstance = verifyQueryPartial(DMAF.getInstance);
    DMAF.getInstanceProperty = function (type, instanceId, properties) {
        var instance = DMAF.getInstance(type, instanceId);
        if (!instance) {
            if (dmaf.log) console.log("missing instance", type, instanceId);
            return null;
        }
        property = instance;
        for (var i = 0, ii = properties.length; i < ii; i++) {
            if (typeof property !== "undefined" &&
                    (typeof property === "object" || typeof property === "function")) {
                property = property[properties[i]];
            } else {
                break;
            }
        }
        if (i !== ii) {
            if (dmaf.log) console.log("Could not find property.");
            return null;
        }
        return property;
    };
    DMAF.getInstanceProperty = verifyQueryPartial(DMAF.getInstanceProperty);
    DMAF.addInstance = function (instance) {
        if (!this.InstancePrototype.isPrototypeOf(instance)) {
            if (dmaf.log) console.log("DMAF.addInstance may only be used with DMAF instances");
            return;
        }
        if (DMAF[instance.type][instance.id]) {
            DMAF[instance.type][instance.id].addInstance(instance);
        } else {
            console.log("Error!", instance);
        }
    };
    DMAF.removeInstance = function (type, instanceId) {
        var instance = this.getInstance(type, instanceId);
        if (instance) {
            return this[instance.type][instance.id].removeInstance(instanceId);
        } else {
            if (dmaf.log) console.log("DMAF.remove: Could not find instance", type, instanceId);
            return false;
        }
    };
    DMAF.removeInstance = verifyQueryPartial(DMAF.removeInstance);
    DMAF.InstancePrototype = {
        audioParam: (function () { //comment this, why do we need it?
            var gain = DMAF.context.createGainNode().gain;
            return Object.getPrototypeOf(gain.constructor.prototype);
        })(),
        setInitProperties: function (properties) {
            var keys = Object.keys(properties), key, i = 0;
            for (;(key = keys[i++]);) { //still not a big fan of this...
                this[key] = properties[key];
            }
            this.setDynamicValues();
            return this;
        },
        init: function () {
            return this;
        },
        onAction: function () {
            return this;
        },
        returnChildInstance: function (targetParameter) { //probably think about naming this differently, I can't tell straight away what it does, but based on the argument it's something about audioparams?
            var chain, key, i, ii, child;
            if (colon.test(targetParameter)) {
                chain = targetParameter.split(colon);
                if (chain.length && chain.length > 1) {
                    child = this;
                    for (i = 0, ii = chain.length; i < ii; i++) {
                        key = chain[i];
                        child = child[key];
                        if (typeof child !== "object") return {self: this, ref: targetParameter}; //why does this return a different object than the other return?
                        if (DMAF.InstancePrototype.isPrototypeOf(child)) {
                            chain = chain.slice(i + 1).join(":");
                            return child.returnChildInstance(chain);
                        }
                    }
                }
            }
            return {instance: this, ref: targetParameter};
        },
        setProperty: function (targetParameter, value, duration, actionTime) {
            var chain, i, ii, key, //clean up unused variables here
                targetProperty, def, param, method,
                nested = this.returnChildInstance(targetParameter);
            if (nested.instance !== this) {
                return nested.instance.setProperty(nested.ref, value, duration, actionTime);
            } else {
                if (colon.test(targetParameter)) {
                    if (dmaf.log) console.log("DMAF Does not support colon syntax for properties within arrays."); //within arrays? I'm confused...
                    return;
                } else {
                    if (this[targetParameter] !== undefined) {
                        value = this.verify(targetParameter, value);
                    } else {
                        if (dmaf.log) console.log(targetParameter, "is not a valid property for instance type", this.id);
                        return;
                    }
                }
            }
            if (targetParameter === "volume") {
                value = DMAF.Utils.dbToWAVolume(value);
            }
            if (this.audioParam.isPrototypeOf(this[targetParameter])) { //comments would be a good idea here
                if (actionTime < DMAF.context.currentTime * 1000) {
                    //console.log("actionTime", actionTime, "was before current Time", DMAF.context.currentTime * 1000);
                    actionTime = DMAF.context.currentTime * 1000;
                }
                actionTime = actionTime && actionTime > DMAF.context.currentTime * 1000 ?
                    actionTime / 1000 : DMAF.context.currentTime;
                duration = duration = duration ? duration / 1000 : 0;
                if(!duration) {
                    method = "setValueAtTime";
                } else {
                    method = "linearRampToValueAtTime";
                }
                this[targetParameter].cancelScheduledValues(actionTime);
                this[targetParameter].setValueAtTime(this[targetParameter].value, actionTime);
                this[targetParameter][method](value, duration + actionTime);
            } else {
                this[targetParameter] = value;
            }
        },
        setDynamicValues: function () { //should add comments - I can't tell what this does without knowing the concept of dynamic values
            var vals = this._dynamicValues, key, string, value;
            if (!vals) return;
            for (var i = 0, ii = vals.length; i < ii; i++) {
                string = vals[i].string || "string_not_defined";
                key = vals[i].key;
                value = DMAF.getInstanceProperty(string);
                this[key] = this.verify(key, value);
            }
            return this;
        },
        verify: function (key, value, descriptor) { //is this the same thing as the one in DMAF.Utils?
            var model, error, chain; //chain is unused
            model = descriptor ? descriptor : this.defaults[key],
            error = !!model; //what does these two lines do?
            error = value === undefined;
            switch (model.type) {
                case "int":
                    error = (parseFloat(value) !== parseInt(value, 10)); //this doesn't seem right.. parseFloat("4") will be the same as parseInt("4")
                    value = parseInt(value, 10);
                    error = isNaN(value); //shouldn't we break wherever error == true? We keep reassigning the error value even if it's true? Same thing for floats below.
                    error = !isFinite(value);
                    error = typeof value !== "number";
                    if (value < model.min) value = model.min;
                    if (value > model.max) value = model.max;
                    break;
                case "float":
                    if (isNaN(parseFloat(value))) error = true;
                    if (!isFinite(value)) error =  true;
                    if (typeof value !== "number") error = true;
                    value = parseFloat(value);
                    if (value < model.min) value = model.min;
                    if (value > model.max) value = model.max;
                    break;
                case "string":
                    error = typeof value !== "string";
                    break;
                case "list":
                    error = !(value instanceof Array);
                    break;
                case "enum":
                    error = model.value.indexOf(value) === -1;
                    break;
                case "array":
                    if (dmaf.log) console.log("Array type found in verify", key, value, descriptor); //what does this mean? I wouldn't know what to do if I got this log.. And why do we call it list?
                    break;
                case "boolean":
                    error = typeof value !== "boolean";
                    break;
            }
            if (!error) {
                return value;
            } else {
                if (dmaf.log) console.log("DMAF Verification error", key, value, this);
                return model["default"];
            }
        }
    };
    DMAF.setValueAtTime = function (obj, param, value, actionTime) {
        DMAF.Clock.checkFunctionTime(actionTime, function () {
            obj[param] = value;
        }, [], DMAF);
    };
    function InstanceType (constructor, doNotManage) { //add comment what this does and what it's used for?
        this.activeInstances = Object.create(null);
        this.constructor = constructor;
        this.isManaged = !doNotManage; //what happens if isManaged == false? Or, by all means, if isManaged == true too? :)
    }
    InstanceType.prototype = {
        getInstance: function (instanceId) {
            return this.activeInstances[instanceId];
        },
        removeInstance: function (instanceId) {
            return delete this.activeInstances[instanceId];
        },
        addInstance: function (instance) {
            this.activeInstances[instance.instanceId] = instance;
        },
        createInstance: function (properties) {
            var instance = new this.constructor(properties);
            instance.setInitProperties(properties).init(properties);
            if (this.isManaged) DMAF.addInstance(instance);
            return instance;
        }
    };
    //Verifies a top-level query either using colon syntax or type/instanceId as separate args
    function verifyQueryPartial (f) {
        return function (string) {
            var args, propString;
            if (colon.test(string)) {
                args = string.split(colon);
                if (args.length > 2) { //Is property string
                    propString = args.slice(2);
                    args.length = 2;
                    args.push(propString); //wait... what happens here? We slice args, and then we push the sliced part again? And why do we set the length of args above?
                } //is there an else case?
            } else {
                args = arguments;
            }
            if (!args[0]) {
                if (dmaf.log) console.log("Missing arguments!");
                return null;
            }
            if (!DMAF[args[0]]) {
                if (dmaf.log) console.log("Invalid type!", args[0]);
                return null;
            }
            return f.apply(DMAF, args);
        };
    }
});
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
            if (dmaf.log) console.log("DMAF.parse: invalid type", type);
            return null;
        }
    };
    var parsers = {
        midi: parseMidiFile,
        samplemap: parseSampleMap
    };
    //FIX!!! DOES NOT THROW ERROR ON MALFORMED SAMPLE MAPS
    function parseSampleMap(xml) {
        if (!xml) {
            if (dmaf.log) console.log("Problem parsing XML", arguments);
            return;
        }
        var maps = xml.querySelectorAll("samplemap"),
            keys = ["sound", "root", "low", "hi", "vol"],
            i, ii, j, jj, k, kk, map, ranges, name, res;
        for (i = 0, ii = maps.length; i < ii; i++) {
            map = maps[i];
            name = map.getAttribute("name");
            ranges = map.querySelectorAll("range");
            res = {};
            for (j = 0, jj = ranges.length; j < jj; j++) {
                res["range_" + j] = {
                    sound: ranges[j].getAttribute("sound"),
                    root: ranges[j].getAttribute("root"),
                    low: ranges[j].getAttribute("low"),
                    hi: ranges[j].getAttribute("hi"),
                    vol: parseFloat(ranges[j].getAttribute("vol"))
                };
            }
            DMAF.setAsset("sampleMap", name, res);
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
                    if (dmaf.log) console.log("Time division in SMPTE, defaulting to 480 ticks per beat");
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
                if (this.chunk.id !== type) {
                    console.log("MidiParser expected", type, "but found", this.chunk.id);
                    return this;
                }
                this.chunk.length = this.read32BitInt();
                this.chunk.data = this.readTo(this.chunk.length);
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
            b.duration = a.absoluteTime - b.absoluteTime;
            return b.duration;
        }
    }
    //Return the character from the character code of a chracter bitwise & 255
    function fromChar (string) {
        return String.fromCharCode(string.charCodeAt(0) & 255);
    }
});
dmaf.once("load_modules", function (DMAF) {
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
            active: {
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
    DMAF.AudioNodes.Panner = function (properties) {
        this.input = DMAF.context.createGainNode();
        this.splitter = DMAF.context.createChannelSplitter(2);
        this.lGain = DMAF.context.createGainNode();
        this.rGain = DMAF.context.createGainNode();
        this.merger = DMAF.context.createChannelMerger(2);
        this.output = DMAF.context.createGainNode();

        this.input.connect(this.splitter);
        this.splitter.connect(this.lGain, 0);
        this.splitter.connect(this.rGain, 1);
        this.lGain.connect(this.merger, 0, 0);
        this.rGain.connect(this.merger, 0, 1);
        this.merger.connect(this.output);

        this.pan = properties.value;
    };
    DMAF.AudioNodes.Panner.prototype = Object.create(Super, {
        pan: {
            get: function () {
                return this._value;
            },
            set: function (value) {
                var normalized = (value + 100) / 200;
                this._value = value;
                this.lGain.gain.value = Math.cos(normalized * Math.PI / 2);
                this.rGain.gain.value = Math.sin(normalized * Math.PI / 2);
            }
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
                return this.delayL.filter.frequency;
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
dmaf.once("load_modules", function (DMAF) {
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
                    if (dmaf.log) console.log("Invalid behavior type for TimePattern", this.behavior);
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
                if (dmaf.log) console.error("You must specify a loopLength for pattern " + this.patternId + " if loop is set to true.");
            }
            if (this.currentBeat === this.loopLength) {
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
    DMAF.setAsset("beatPattern", "empty_pattern", new DMAF.Processor.BeatPattern('empty_pattern', 1));
});
dmaf.once("load_modules", function (DMAF) {
    var methods = {
        "ROUND_ROBIN": function () {
            this.index++;
            this.index %= this.array.length;
            return this.array[this.index];
        },
        "RANDOM_FIRST": function () {
            if (this.index === -1) {
                return this.array[Math.floor(Math.random() * this.array.length)];
            } else {
                return this.array[++this.index];
            }
        },
        "RANDOM": function () {
            return this.array[Math.floor(Math.random() * this.array.length)];
        },
        "SHUFFLE": function () {
            var i;
            if (!this.A.length) {
                this.A = this.array.slice(0);
                this.B = [];
            }
            do {
                i = Math.floor(Math.random() * this.A.length);
            }
            while(this.A[i] === this.previous);
            this.B.push(this.A.splice(i, 1)[0]);
            this.previous = this.B[this.B.length - 1];
            return this.previous;
        }
    };
    DMAF.Iterator = function (sounds, type) {
        this.index = -1;
        this.array = sounds;
        this.getNext = methods[type];
        this.A = sounds.slice(0);
        this.B = [];
    };
});

if (!dmaf && typeof require !== "undefined") {
    var dmaf = require("../facade.js");
}
dmaf.once("load_core", function (DMAF) {
    var propertyModel = {
        "automatable": "boolean",
        "default": "fromType",
        "valueType": "string",
        "value": "fromType",
        "min": "fromType",
        "max": "fromType",
        "name": "string",
        "type": "string",
        "values": "list",
        "unit": "string",
        "src": "string"
    },
    Default = "default",
    tag = "getElementsByTagName",
    attr = "getAttribute",
    intRegex = /^\s*-?[0-9]{1,10}\s*$/,
    Descriptors,
    exports = {};

    //Helper to iterate over object or array, breaks if true is returned.
    function each (it, func) {
        var i = 0, keys, key, ii;
        if (it instanceof Array) {
            for (i = 0, ii = it.length; i < ii; i++) {
                if (it[i] && func(i, it[i])) break;
            }
        } else if (typeof it === "object") {
            keys = Object.keys(it);
            for (i = 0, ii = keys.length; i < ii; i++) {
                key = keys[i];
                if (key === "length") continue;
                if (it[key] && func(key, it[key])) break;
            }
        } else {
            console.error("Not array or object", typeof it, it);
        }
    }
    //Checks if element's descriptor contains one or more arrays.
    function arrayCheck (descriptor) {
        var result = [];
        if (!descriptor) {
            console.error("Missing descriptor");
        }
        each(descriptor, function (key, member) {
            if (member.type === "array") {
                result.push(member);
            }
        });
        return result; //Return all descriptors for arrays.
    }
    //Checks if a value present on the descriptor is undefined, sets default value
    function defaultCheck (target, descriptor, name) {
        each(descriptor, function (key, member) {
            if (target[key] === undefined || target[key] === "undefined") {
                target[key] = descriptor[key][Default];
            }
        });
        return target;
    }
    //Gives back a descriptor for an action based on id only
    function getActionDescriptorFromId (id) {
        var result;
        each(Descriptors.action, function (key, member) {
            each(member, function (key, member) {
                if (key === id) {
                    result = member;
                    return result;
                }
            });
            return result;
        });
        return result || console.error("Could not find action with Id of", id);
    }
    //Retrieve all tag names of a value type
    function getAllTagsOfValueType(valueType) {
        return Object.keys(Descriptors.type[valueType]).filter(function (elem) {
            return elem !== "type";
        });
    }
    //Remove any whitespace from a string
    function removeWhiteSpace (string) {
        return string.replace(/\s+/g, "");
    }
    //Parse all attributes from a property of an element into a javascript object
    function parseProperty (element) {
        var attrs = element.attributes,
            result = {},
            name;
        for(var i = 0, ii = attrs.length; i < ii; i++) {
            name = attrs[i].nodeName;
            if (propertyModel[name]) {
                result[name] = fromString(propertyModel[name], attrs[i].value, element);
            }
        }
        return result;
    }
    //Translates an attribute value from a string to the appropriate type
    function fromString (type, value, model) {
        if(value === undefined || value === "undefined") {
            return undefined;
        }
        switch(type) {
            case "string":
                return value;
            case "boolean":
                return value === "true";
            case "int":
                return parseInt(value, 10);
            case "float":
                return parseFloat(value);
            case "list":
                return value.split(",");
            case "enum":
                return value;
            case "fromType":
                return fromString(model[attr]("type"), value, model);
            default:
                console.error(type);
        }
    }
    //Parses the action properties from an action type xml element
    function parseActionProperties (actionNode, descriptor, name) {
        var properties = actionNode[tag]("properties"),
            arrays = arrayCheck(descriptor),
            subDescriptor,
            subNode,
            result = {},
            i, ii;
        //Parse all properties tags for this action
        each(properties, function (i, el) {
            if (el.localName) {
                parseAttributes(result, el, descriptor);
            }
        });
        //Parse all arrays
        each(arrays, function (i, sub) {
            if (actionNode[tag]) {
                var array = actionNode[tag](sub.name)[0] || [];
                result[sub.name] = array ? parseArray(array, sub.valueType) : [];
            } else {
                result[sub.name] = [];
            }
        });
        return defaultCheck(result, descriptor, name);
    }
    //Parses attributes of an xml element using a descriptor object
    function parseAttributes (target, node, descriptor) {
        var attrs = node.attributes;
        for (var i = 0, ii = attrs.length; i < ii; i++) {
            if (descriptor[attrs[i].localName] === undefined) {
                if (attrs[i].localName !== "triggers" && attrs[i].localName !== "delay") {
                    return console.error("Invalid attribute", attrs[i].localName, "check spelling in descriptors");
                }
            }
        }
        each(descriptor, function (key, member) {
            if (node.hasAttribute(key)) {
                value = node[attr](key);
                if (/\:/.test(value) && !/target/.test(key)) { //Detect dyamic properties
                    target._dynamicValues = target._dynamicValues || [];
                    target._dynamicValues.push({key: key, string: value});
                    target[key] = member[Default];
                } else {
                    value = fromString(member.type, value, member);
                    target[key] = verify(member, value);
                }
            }
        });
    }
    //Parses attributes of type array
    function parseArray (node, valueType) {
        if (node[tag]) {
            var allowedTags = getAllTagsOfValueType(valueType),
                elements = [],
                result = [],
                arrays,
                typeDescriptors = Descriptors.type[valueType];
            each(allowedTags, function (i, elem) {
                var tags = node[tag](elem);
                each(tags, function (i, elem) {
                    if (elem && elem.localName) {
                        elements.push(elem);
                    }
                });
            });
            each(elements, function (i, elem) {
                if (elem.localName && typeDescriptors[elem.localName]) {
                    var element = {id: elem.localName},
                        arrays = arrayCheck(typeDescriptors[element.id]);
                    parseAttributes(element, elem, typeDescriptors[element.id]);
                    each(arrays, function (i, arrayDescriptor) {
                        var subNode = node[tag](arrayDescriptor.name)[0];
                        if (subNode && subNode[tag]) {
                            element[arrayDescriptor.name] = parseArray(subNode, arrayDescriptor.valueType);
                        } else {
                            element[arrayDescriptor.name] = [];
                        }
                    });
                    result.push(element);
                }
            });
            return result;
        } else {
            return [];
        }
    }
    //Limit a value to min/max
    function constrain (value, model) {
        if (value > model.max) {
            console.log(value, "is out of range. constraining", model.name, "to:", model.max);
            value = model.max;
        }
        if (value < model.min) {
            console.log(value, "is out of range. constraining", model.name, "to:", model.min);
            value = model.min;
        }
        return value;
    }
    //Verify an action using a descriptor, if values are invalid it will default
    function verify (model, value, name) {
        var error;
        if (!model || model.type === undefined) {
            console.warn("DMAF Verification Error: Malformed descriptor!");
        }
        if (value === undefined) {
            return model[Default];
        }
        switch (model.type) {
            case "int":
                if (!intRegex.test(value)) {
                    error = true;
                    break;
                }
                value = constrain(value, model);
                break;
            case "float":
                if (isNaN(value)) {
                    error = true;
                    break;
                }
                value = constrain(value, model);
                break;
            case "string":
                if (value === "undefined") {
                    value = undefined;
                }
                if (typeof value !== "string") {
                    error = true;
                }
                break;
            case "list":
                error = !(value instanceof Array);
                break;
            case "enum":
                if (model.values && model.values instanceof Array) {
                    if (model.values.indexOf(value) === -1) {
                        console.log(value, "is not valid enum for", model.name);
                        error = true;
                    }
                } else {
                    console.log("Malformed descriptors object", model.name);
                    error = true;
                }
                break;
            case "boolean":
                error = typeof value !== "boolean";
                break;
            default:
                console.warn("Malformed defaults object. Please check the descriptors.xml");
        }
        if (!error) {
            return value;
        } else {
            console.warn(value, "is not valid for", model.name);
            console.warn("Defaulting", model.name, "to", model[Default]);
            return model[Default];
        }
    }
    //Parse the descriptors from xml into a javascript object
    function parseDescriptors (xml) {
        var descriptorNodes = xml[tag]("descriptor"),
            descriptors = {
                validActions: [],
                validTypes: []
            },
            descriptor,
            properties,
            property,
            current,
            class_,
            type,
            id;
        each(descriptorNodes, function (i, node) {
            if (node[attr]) {
                id = node[attr]("id");
                type = node[attr]("type");
                class_ = node[attr]("class");

                descriptors[class_] = descriptors[class_] || {};
                descriptors[class_][type] = descriptors[class_][type] || {};
                descriptors[class_][type][id] = current = descriptors[class_][type][id] || {};
                descriptors[class_][type][id].type = type;
                descriptors[class_][type][id].id = id;
                descriptors[class_][type].type = type;
                if(class_ === "action") {
                    descriptors.validActions.push(id);
                }
                if(class_ === "type") {
                    descriptors.validTypes.push(id);
                }
                properties = node[tag]("property");
                each(properties, function (i, node) {
                    if (node[attr]) {
                        current[node[attr]("name")] = parseProperty(node);
                    }
                });
            }
        });
        Descriptors = descriptors;
        return Descriptors;
    }
    //Parse config.xml for actions
    function parseActions (xml) {
        var actionNodesRaw = xml[tag]("actions")[0].childNodes,
            actionNodes = [],
            actions = [];

        each(actionNodesRaw, function (i, elem) {
            if (elem && elem.localName && elem[tag]) {
                if (Descriptors.validActions.indexOf(elem.localName) !== -1) {
                    actionNodes.push(elem);
                } else {
                    console.error("Unrecognized action!", elem.localName, "check spelling.");
                    //return true;
                }
            }
        });
        each(actionNodes, function (i, node) {
            if (node.localName && node[tag]) {
                var id = node.localName,
                    descriptor = getActionDescriptorFromId(id),
                    actionProperties = parseActionProperties(node, descriptor, node.localName),
                    type = descriptor.type,
                    triggers = node[attr]("triggers"),
                    delay = node[attr]("delay"),
                    instanceId = node[attr]("instanceId");
                    Settings = {};

                if (triggers) {
                    triggers = triggers.split(",").map(removeWhiteSpace);
                } else {
                    console.error("Action", type, id, actionProperties.instanceId, "has no triggers!");
                    return true;
                }

                actions.push({
                    type: type,
                    id: node.localName,
                    triggers: triggers,
                    actionProperties: actionProperties,
                    delay: parseInt(delay, 10) || 0,
                    instanceId: instanceId
                });
            }
        });
        return actions;
    }
    exports.parseActions = parseActions;
    exports.parseDescriptors = parseDescriptors;
    exports.verify = verify;
    exports.each = each;
    DMAF.Parser = exports;
});
dmaf.once("load_core", function load_Utils (DMAF) {
    var INT = "int",
        FLOAT = "float",
        STRING = "string",
        BOOLEAN = "boolean",
        logicMIDIMap = {
            cflat: -1,
            c: 0,
            csharp: 1,
            dflat: 1,
            d: 2,
            dsharp: 3,
            eflat: 3,
            e: 4,
            esharp: 5,
            fflat: 4,
            f: 5,
            fsharp: 6,
            gflat: 6,
            g: 7,
            gsharp: 8,
            aflat: 8,
            a: 9,
            asharp: 10,
            bflat: 10,
            b: 11,
            bsharp: 12
        };
    DMAF.Utils = {
        ajax: function (src, callback, options) {
            var xhr = new XMLHttpRequest(),
                returnArgs = [],
                callbacks = [callback],
                onerror;

            if (options) {
                if (options.override) xhr.overrideMimeType(options.override);
                if (options.responseType) xhr.responseType = options.responseType;
                if (options.chain) callbacks = callbacks.concat(options.chain);
                if (options.args) returnArgs = returnArgs.concat(options.args);
            } else {
                options = {};
            }
            onerror = options.fail ? options.fail : function DMAFajaxOnError (e) {
                if (dmaf.log) console.log("DMAF.ajax: Problem with request", src);
            };
            function onreadystate () {
                if (this.readyState === 4) {
                    var context = options && options.context || DMAF,
                        result,
                        success = this.status >= 200 && this.status < 300 || this.status === 304;
                    if (!success || !this.response) {
                        xhr.onerror = function () {};
                        return onerror();
                    }
                    if (options && options.expectType && typeof this.response !== options.expectType) {
                        return onerror();
                    }
                    result = options.responseXML ? this.responseXML : this.response;
                    if (options.responseXML && !this.responseXML) {
                        if (dmaf.log) console.log("Problem with XMLHttpRequest: XML is missing or malformed.", src);
                        return onerror();
                    }
                    for (var i = 0, ii = callbacks.length; i < ii; i++) {
                        returnArgs.unshift(result); //should this really be inside the loop?
                        result = callbacks[i].apply(context, returnArgs);
                    }
                }
            }
            xhr.onerror = onerror;
            xhr.onreadystatechange = onreadystate;
            xhr.open('GET', src, true);
            xhr.send();
        },
        clone: function (obj) {
            if (typeof obj !== "object") {
                return {};
            }
            return JSON.parse(JSON.stringify(obj)); //interesting. :) Do we only use this function to clone objects with primitive values?
        },
        calculateAverage: function (array) {
            var sum = 0, i = 0, ii = array.length;
            for (; i < ii; i++) { //not declaring the vars in the pre-loop here just makes it harder to read, I think.
                sum += array[i];
            }
            return sum / array.length;
        },
        dbToJSVolume: function (db) {
            var volume = Math.max(0, Math.round(100 * Math.pow(2, db / 6)) / 100);
            return Math.min(1, volume);
        },
        dbToWAVolume: function (db) {
            return Math.max(0, Math.floor(100 * Math.pow(2, db / 6)) / 100);
        },
        capitalize: function (string) {
            return string.charAt(0).toUpperCase() + string.slice(1);
        },
        createEffectsRecursive: function (lastFx, effectsArray) {
            var effects = [],
                fxProperties, effect;
            for (var i = 0; i < effectsArray.length; i++) {
                fxProperties = effectsArray[i];
                effect = new DMAF.AudioNodes[this.capitalize(fxProperties.id)](fxProperties);
                if (fxProperties.active) {
                    effect.activate(true);
                } else {
                    effect.activate(false);
                }
                effects.push(effect);
                // connect to the previous effect
                lastFx.connect(effect.input);
                lastFx = effect;
            }
            return effects;
        },
        fromString: function (type, value) {
            if (value === undef) return undefined; //where is undef defined?
            switch (type) {
            case "string": //indentation on cases (damn you sublime code-formatter!)
                return value;
            case "boolean":
                return value === "true";
            case "int":
                return parseInt(value, 10);
            case "float":
                return parseFloat(value);
            case "list":
                return value.split(separator);
            default:
                console.error("FromString Error: ", type, value);
            }
        },
        MIDIToFrequency: function (midiNote) {
            return 8.1757989156 * Math.pow(2.0, midiNote / 12.0);
        },
        removeWhiteSpace: function (string) {
            return string.replace(/\s+/g, "");
        },
        toMIDINote: function (logicNote) {
            var midiNote, note, mod, octave, octavePosition;
            if (logicNote[1] === "#" || logicNote[1].toLowerCase() === "s") {
                note = logicNote[0].toLowerCase() + "sharp";
                octavePosition = 2;
            } else if (logicNote[1] === "b") {
                note = logicNote[0].toLowerCase() + "flat";
                octavePosition = 2;
            } else {
                note = logicNote[0].toLowerCase();
                octavePosition = 1;
            }
            note = logicMIDIMap[note];
            if (logicNote[octavePosition] === "-") {
                octave = ((0 - parseInt(logicNote[octavePosition + 1], 10)) + 2) * 12;
                //negative octave (logic maps midi note 0 as C-2)
            } else {
                octave = (parseInt(logicNote[octavePosition], 10) + 2) * 12;
            }
            midiNote = octave + note;
            return midiNote;
        },
        getFileFormat: function () {
            var formats = ["ogg", "aac", "mp3", "wav"],
                a = document.createElement('audio'),
                checks = {
                    "wav": 'audio/wav; codecs="1"',
                    "mp3": 'audio/mpeg;',
                    "aac": 'audio/mp4; codecs="mp4a.40.2"',
                    "ogg": 'audio/ogg; codecs="vorbis"'
                };
            function canPlayFormat(format) {
                return !!(a.canPlayType && a.canPlayType(checks[format] || "").replace(/no/, ""));
            }
            for (var i = 0, ii = formats.length; i < ii; i++) if (canPlayFormat(formats[i])) { //moar {}'s here!
                DMAF.fileFormat = "." + formats[i];
                return;
            }
            console.error("Couldn't play any of the wanted file formats!");
            DMAF.fileFormat = null; //do we need this to be null? Otherwise I'd rather keep it as undefined.. just because..
        },
        verify: function (model, value, name) { //without having read the function - what is it we verify?
            var error;
            if (typeof model === "string") {
                model = this.defaults[model];
            }
            if (value === undefined) {
                return model["default"];
            }
            if (model.type === undefined) {
                console.error("DMAF Verification Error: Malformed defaults object.");
                //should we return here?
            }
            switch (model.type) {
            case "int": //indentation
                if (parseFloat(value) !== parseInt(value, 10)) {
                    error = typeError;
                }
                if (isNaN(value)) {
                    error = typeError;
                }
                if (value < model.min) {
                    error = rangeErrorMin;
                }
                if (value > model.max) {
                    error = rangeErrorMax;
                }
                break;
            case "float":
                if (isNaN(value)) {
                    error = typeError;
                }
                if (value < model.min) {
                    error = rangeErrorMin;
                }
                if (value > model.max) {
                    error = rangeErrorMax;
                }
                break;
            case "string":
                if (typeof value !== "string") {
                    error = typeError;
                }
                break;
            case "list":
                if (!(value instanceof Array)) {
                    error = typeError;
                }
                break;
            case "enum":
                if (model.values) {
                    if (model.values.indexOf(value) === -1) {
                        error = listError;
                    } else {
                        break;
                    }
                } else {
                    console.error("DMAF Verification Error! Missing values list for enum type value.");
                    error = true;
                }
                break;
            case "boolean":
                if (typeof value !== "boolean") {
                    error = typeError;
                }
                break;
            default:
                console.error("DMAF Verification Error! Malformed defaults object. Please check the descriptors.xml");
            }
            if (!error) {
                return value;
            } else {
                error(value, model);
                return model["default"];
            }
        }
    };
    function typeError(value, model) {
        if (dmaf.log) console.log("DMAF TypeError for " + model.name + ": " + value + " is not of type " + model.type);
        return model["default"];
    }

    function rangeErrorMin(value, model) {
        if (dmaf.log) console.log("DMAF RangeError for " + model.name + ": " + value + " is below minimum threshold.");
        return model.min;
    }

    function rangeErrorMax(value, model) {
        if (dmaf.log) console.log("DMAF RangeError for " + model.name + ": " + value + " is above maximum threshold.");
        return model.max;
    }

    function listError(value, model) {
        if (dmaf.log) console.log("DMAF enumError for " + model.name + ": " + value + " is not an allowed value");
        return model["default"];
    }
});
dmaf.once("load_modules", function (DMAF) {

    function LevelTransposer () {
        this.transposeValue = 0;
        this.lastActionTime = -5000;
    }
    LevelTransposer.prototype = Object.create(DMAF.InstancePrototype, {
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                var throttle = (actionTime - this.lastActionTime) < 5000;
                switch (trigger) {
                    case "user_won_round":
                        if (throttle) return;
                        this.transposeValue++;
                        break;
                    case "user_lost_round":
                        if (throttle) return;
                        this.transposeValue++;
                        break;
                    case "user_won_match":
                        this.transposeValue = 0;
                        break;
                    case "user_lost_match":
                        this.transposeValue = 0;
                        break;
                }
                this.lastActionTime = actionTime;
            }
        }
    });
    DMAF.registerInstance("customCode", "LevelTransposer", LevelTransposer);
});