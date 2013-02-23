dmaf.once("load_eventProcessor", function (DMAF) {
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
                            console.log("DMAF.EventMapper: ", trigger, " is the same in event as output. Ignoring...");
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
    DMAF.registerInstance(type, "EventMapper", EventMapper);

    function MidiNoteMapper () {}
    MidiNoteMapper.prototype = Object.create(Super, {
        init: {
            value: function () {
                for (var i = 0, ii = this.eventMaps.length; i < ii; i++) {
                    this.eventMaps[i]["in"] = parseInt(this.eventMaps[i]["in"], 10);
                    if (isNaN(this.eventMaps[i]["in"])) {
                        console.log("In value for MidiNoteMapper is NaN!");
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
    DMAF.registerInstance(type, "MidiNoteMapper", MidiNoteMapper);
});