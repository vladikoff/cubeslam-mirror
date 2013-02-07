dmaf.once("load_mediaElement", function (DMAF) {
    var type = "mediaElement",
        Super = DMAF.InstancePrototype;

    function MediaElement () {}
    MediaElement.prototype = Object.create(Super, {
        init: {
            value: function (properties) {
                this.lastSeeked = DMAF.context.currentTime;
                this.lastPlayTime = DMAF.context.currentTime;
                this.seeking = false;
            }
        },
        currentTime: {
            get: function () {
                if (this.element) {
                    return this.element.currentTime;
                }
            },
            set: function () {
                console.log("MediaElement currentTime is read-only");
            }
        },
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                if (this.element) return null;
                var id = this.instanceId,
                    element = DMAF.pendingObjects[id];
                if (!element) {
                    console.log("DMAF Could not locate mediaElement with id", this.instanceId);
                } else {
                    if (!element.instanceId || element.instanceId !== this.instanceId) {
                        element.instanceId = this.instanceId;
                    }
                    if (element instanceof HTMLElement) {
                        if (element.tagName === "VIDEO" || element.tagName === "AUDIO") {
                            this.element = element;
                            element.DMAFListener = this;
                            console.log("Adding addListeners");
                            this.addListeners(element);
                        } else {
                            console.log("DMAF does not support registering HTML elements other than <video> and <audio>");
                        }
                    }
                }
            }
        },
        removeElement: {
            value: function () {
                this.element.removeEventListener("play", onplay);
                this.element.removeEventListener("pause", onpause);
                this.element.removeEventListener("seeking", onseeking);
                delete this.element.DMAFListener;
                delete this.element;
            }
        },
        addListeners: {
            value: function (element) {
                element.addEventListener("play", onplay);
                element.addEventListener("pause", onpause);
                element.addEventListener("seeking", onseeking);
            }
        },
        checkTime: {
            value: function () {
                var currentTime = this.element.currentTime;
                for (var i = 0, ii = this.timeoutEvents.length; i < ii; i++) {

                }
            }
        }
    });
    function oncanplay () {
        this.removeEventListener("canplay", oncanplay, false);
        DMAF.ActionManager.onEvent(this.instanceId + ".START", (DMAF.context.currentTime - this.currentTime) * 1000);
    }
    function onplay (e) {
        if (this.readyState !== 4)  {
            this.addEventListener("canplay", oncanplay, false);
        } else {
            this.DMAFListener.lastPlayTime = this.currentTime;
            DMAF.Clock.addFrameListener(this.DMAFListener.instanceId, checkIfPlaying, this.DMAFListener);
        }
    }
    function onpause (e) {
        DMAF.ActionManager.onEvent(this.instanceId + ".STOP", DMAF.context.currentTime * 1000);
    }
    function onseeking (e) {
        if (!this.DMAFListener.seeking) {
            DMAF.ActionManager.onEvent(this.instanceId + ".SEEKING", DMAF.context.currentTime * 1000);
        }
        this.DMAFListener.seeking = true;
    }
    function checkIfPlaying () {
        if (this.element.currentTime !== this.lastPlayTime) {
            console.log("START IN CHECK");
            DMAF.ActionManager.onEvent(this.instanceId + ".START", (DMAF.context.currentTime - this.currentTime) * 1000);
            DMAF.Clock.removeFrameListener(this.instanceId);
        }
    }
    DMAF.registerInstance(type, "MediaElement", MediaElement);
    DMAF.mediaElement.MediaElement.removeInstance = function (instanceId) {
        var instance = DMAF.getInstance("mediaElement:" + instanceId);
        if (instance) {
            instance.removeElement();
            console.log("removing mediaElement id:", instanceId);
        }
        return delete this.activeInstances[instanceId];
    };
    function MediaController () {

    }
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
                var instance = DMAF.mediaElement.MediaElement.createInstance(
                    {instanceId: instanceId, type: type, id: "MediaElement"});
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
                DMAF.Clock.checkFunctionTime(
                    actionTime,
                    DMAF.mediaElement.MediaElement.removeInstance,
                    [],
                    DMAF.mediaElement.MediaElement,
                    instanceId
                );
            }
        }
    });
    DMAF.registerInstance(type, "MediaController", MediaController, true);
});