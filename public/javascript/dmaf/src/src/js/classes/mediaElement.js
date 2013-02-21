dmaf.once("load_mediaElement", function (DMAF) {
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
                    if (element instanceof HTMLElement) {
                        if (element.tagName === "VIDEO" || element.tagName === "AUDIO") {
                            this.element = element;
                            this.playing = false;
                            this.lastPlayTime = element.currentTime;
                            DMAF.Clock.addFrameListener(this.type + ":" + this.instanceId, this.poll, this);
                        } else {
                            console.log("DMAF does not support registering HTML elements other than <video> and <audio>");
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
                } else if (this.lastPlayTime > this.elementCurrentTime) {           //Element has skipped backward
                    DMAF.ActionManager.onEvent(this.instanceId + ".STOP", DMAF.context.currentTime * 1000);
                    DMAF.ActionManager.onEvent(this.instanceId + ".START", (DMAF.context.currentTime - this.currentTime) * 1000);
                } else if (this.element.currentTime - this.lastPlayTime > 0.25) {    //Element has skipped forward

                    DMAF.ActionManager.onEvent(this.instanceId + ".STOP", DMAF.context.currentTime * 1000);
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
    DMAF.registerInstance(type, "MediaElement", MediaElement);
    DMAF.mediaElement.MediaElement.removeInstance = function (instanceId) {
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
                return DMAF.mediaElement.MediaElement.removeInstance(instanceId);
            }
        }
    });
    DMAF.registerInstance("control", "MediaController", MediaController, true);
});