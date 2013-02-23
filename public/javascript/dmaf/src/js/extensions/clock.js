dmaf.once("load_core", function (DMAF) {
    var Clock = DMAF.Clock = Object.create(null),
        slice = Array.prototype.slice,
        frameIntervalRunning = false,
        pendingArrays = [],
        timeoutEvents = [],
        frameEvents = [],
        running = false,
        UID = 0,
        last, currentTime, id, f, t, i,
        context = DMAF.context;

    DMAF.preListen = 60;
    DMAF.lastTime = 0;
    DMAF.currentTime = -1;

    function run () {
        var i = 0;
        currentTime = context.currentTime * 1000;
        if (!frameEvents.length && !timeoutEvents.length) {
            running = false;
            return;
        }
        for (;i < frameEvents.length; i++) {
            frameEvents[i].callback.call(frameEvents[i].context);
        }
        for (i = 0; i < timeoutEvents.length; i++){
            if(timeoutEvents[i] && currentTime > timeoutEvents[i].actionTime - DMAF.preListen) {
                timeoutEvents[i].callback.apply(timeoutEvents[i].context, timeoutEvents[i].args);
                timeoutEvents[i].pending.splice(timeoutEvents[i].pendingId, 1);
                timeoutEvents.splice(i--, 1);
            }
        }
        running = true;
        DMAF.lastTime = DMAF.currentTime;
        DMAF.currentTime = DMAF.context.currentTime;
        if(DMAF.lastTime === DMAF.currentTime){
            console.error("Dirty context time!");
        }
        setTimeout(run, 20);
    }
    Clock.checkFunctionTime = function (actionTime, callback, pendingArray, context) {
        if(actionTime >= DMAF.context.currentTime * 1000 + DMAF.preListen) {
            var timeout = {
                pendingId: pendingArray.length,
                pending: pendingArray,
                callback: callback,
                actionTime: actionTime,
                context: context || DMAF,
                args: slice.call(arguments, 4),
                id: UID++
            };
            pendingArray.push(timeout.id);
            timeoutEvents.push(timeout);
            if (!running) {
                running = true;
                run();
            }
        } else {
            callback.apply(context, slice.call(arguments, 4));
        }
    };
    Clock.dropPendingArray = function (array) {
        var i = timeoutEvents.length, isMatch;
        while (i--) {
            if (timeoutEvents[i].pending === array) {
                timeoutEvents.splice(i, 1);
                array.length = 0;
            }
        }
    };
    Clock.addFrameListener = function (id, callback, context) {
        if (checkDuplicate(id)) {
            console.log("That frame listener is already running!", id);
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
        while(i--) {
            if(frameEvents[i].id === id) {
                return true;
            }
        }
        return false;
    }
});