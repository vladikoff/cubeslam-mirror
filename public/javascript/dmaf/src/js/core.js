(function () {
    var script = document.getElementById("DMAF"),
        removed = false,
        stop = false,
        events = {},
        current_event,
        keepAliveMsg = {type: "keepAlive"},
        slice = Array.prototype.slice,
        ourStuff = [];

    //PRIVATE INTERFACE
    var DMAF = {
        pendingObjects: {},
        failure: function () {
            var dummy = function DMAFisNotLoaded () {
                console.log("DMAF failed to load.");
            };
            DMAF.dispatch("dmaf_fail");
            for (var i in dmaf) if (dmaf.hasOwnProperty(i)) {
                dmaf[i] = dummy;
            }
        },
        dispatch: function (eventName) {
            var e = events,
                ce = current_event,
                result = [],
                args = slice.call(arguments, 1);
            current_event = eventName;
            stop = false;
            e = events[eventName];
            if (!e) e = result;
            for (var i = 0; i < e.length; i++) {
                result.push(e[i].apply(e[i].context, args));
                if (removed) {
                    i--;
                    removed = false;
                }
                if (stop) {
                    break;
                }
            }
            current_event = ce;
            return result.length ? result : null;
        }
    };
    //PUBLIC INTERFACE
    window.dmaf = window.dmaf || {};
    dmaf.init = function () {
        DMAF.dispatch("load_framework", DMAF);
    };
    //used by client to send messages to dmaf
    dmaf.tell = function (eventName, eventProperties, eventTime) {
        if (!eventTime) {
            eventTime = parseInt(DMAF.context.currentTime * 1000, 10);
        }
        console.clear();
        switch (eventName) {
            case "shields_reset_up": break;
            case "shields_reset_down": break;
            case "shield_reset_up": break;
            case "shield_reset_down": break;
            case "wall_hit": break;
            case "opponent_paddle_hit": break;
            case "user_paddle_hit": break;
            default:
                ourStuff.push(eventName);
                if (ourStuff.length > 20) ourStuff = ourStuff.slice(10);
        }
        var i = ourStuff.length;
        while (i--) {
            console.group("DMAF.TELL: " + ourStuff[i]);console.groupEnd();
        }
        switch(eventName) {
            case "ping":
            case "latency":
                proceedSync(eventName, eventProperties);
                return;
            case "sync":
                sync();
                return;
            case "broadcastPosition":
                broadcastPosition();
                return;
            case "keep_dead":
                keepAlive(false);
                return;
            case "startPosition":
                keepAlive(true);
        }
        DMAF.ActionManager.onEvent(eventName, eventTime, eventProperties);
    };
    //client can use to add event listener. called with DMAF.dispatch. context here is optional.
    dmaf.addEventListener = function (eventName, handler, context) {
        var e = events;
        e = e[eventName] || (e[eventName] = []);
        for (var i = 0, ii = e.length; i < ii; i++) if (e[i] === handler) {
            return handler;
        }
        handler.context = (context && typeof context === "object") ? context : dmaf;
        e.push(handler);
    };
    //client can use to remove an event listener
    dmaf.removeEventListener = function (eventName, handler) {
        var e = events,
            i;
        e = e[eventName];
        if (!e || !e.length) {
            return;
        }
        i = e.length;
        while (i--) if (e[i] == handler) {
            e.splice(i, 1);
            removed = true;
            break;
        }
    };
    //binds an event handler which only runs once
    dmaf.once = function (eventName, handler, context) {
        handler.context = (context && typeof context === "object") ? context : dmaf;
        var one = function () {
            var result = handler.apply(context, arguments);
            dmaf.removeEventListener(eventName, one);
            return result;
        };
        dmaf.addEventListener(eventName, one, context);
    };
    //can be used inside event handler to get name of the event that is currently executing.
    dmaf.currentEvent = function () {
        return current_event;
    };
    //can be used in event handler to stop event propagation
    dmaf.stop = function () {
        stop = true;
    };
    //sends the message to all including self
    dmaf.registerBroadcaster = function (callback) {
        this.broadcaster = callback;
    };
    //send the message to all excluding self
    dmaf.registerEmitter = function (callback) {
        this.emitter = callback;
    };
    //send the message to all excluding self
    dmaf.registerServerEmitter = function(callback) {
        this.tellServer = callback;
    };
    //register an external object
    dmaf.registerObject = function (id, obj) {
        if (typeof id === "string") {
            id = DMAF.Utils.removeWhiteSpace(id);
            if (!id) {
                console.log("DMAF: You must provide a valid id for the object you wish to register.");
                return;
            }
        } else {
            console.log("DMAF: You must provide a valid id for the object you wish to register.");
        }
        if (!obj || !(obj instanceof Object)) {
            console.log("DMAF: You've tried to register an object not of type 'object'");
            return;
        }

        if (!obj.instanceId) {
            obj.instanceId = id;
        }
        DMAF.pendingObjects[id] = obj;
        DMAF.ActionManager.onEvent(id + ".CREATE");
    };
    //unregister an external object
    dmaf.unregisterObject = function (id) {
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
    };

    //SERVER COMMUNICATION
    function broadcast (eventName, data) {
        data.type = eventName;
        dmaf.broadcaster(data);
    }
    function emit (eventName, data) {
        data.type = eventName;
        dmaf.emitter(data);
    }
    function broadcastPosition () {
        dmaf.emitter({
            type: "startAtPosition",
            songPosition: DMAF.ProcessorManager.getActiveInstance("master").songPosition,
            time: parseInt(DMAF.ProcessorManager.getActiveInstance("master").nextBeatTime + DMAF.serverOffset, 10)
        });
    }
    function sync () {
        //performSync
        //start sending pings
        sync.timesToSync = 10;
        sync.timesSynced = 0;
        sync.travelTimes = [];
        sync.clientTimes = [];
        sync.offsets = [];
        console.time("ping DMAF level");
        dmaf.tellServer({
            clientTime: DMAF.context.currentTime * 1000,
            type: "ping"
        });
    }
    function proceedSync (eventName, data) {
        console.timeEnd("ping DMAF level");
        var currentTime = DMAF.context.currentTime * 1000,
            travelTime = parseInt((currentTime - data.clientTime) / 2, 10),
            offset = parseInt(data.serverTime + travelTime - currentTime, 10);
        sync.travelTimes.push(travelTime);
        sync.clientTimes.push(data.clientTime);
        sync.offsets.push(offset);
        console.log("travled time (one way):", travelTime, "offset to server:", offset);
        if(sync.timesSynced < sync.timesToSync) {
            sync.timesSynced++;
            console.time("ping DMAF level");
            dmaf.tellServer({
                clientTime: DMAF.context.currentTime * 1000,
                type: "ping"
            });
        } else {
            var isChrome = /Chrome/.test(navigator.userAgent) &&
                    !/Mobile/.test(navigator.userAgent) &&
                    !/Windows/.test(navigator.userAgent);
            DMAF.serverOffset = parseInt(DMAF.Utils.calculateAverage(sync.offsets), 10);
            if (isChrome) {
                DMAF.serverOffset -= 35;
            }
            console.log("sync done, offset is", DMAF.serverOffset, sync.clientTimes);
            dmaf.tellServer({
                type: "syncDone"
            });
        }
    }
    function keepAlive (doKeepAlive) {
        if(doKeepAlive) {
            keepAlive.interval = setTimeout(send, 50);
        } else {
            clearTimeout(keepAlive.interval);
        }
    }
    function send () {
        dmaf.tellServer(keepAliveMsg);
        keepAlive.interval = setTimeout(send, 50);
    }

    if (!dmaf.dev) {
        window.addEventListener("load", function () {
            DMAF.dispatch("load_framework", DMAF);
        });
    } else {
        window.DMAF = DMAF;
    }
})();