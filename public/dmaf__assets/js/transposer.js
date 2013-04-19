dmaf("LevelTransposer", ["DMAF", "Instance"], function (DMAF, Instance) {

    function LevelTransposer () {
        this.transposeValue = 0;
        this.lastActionTime = -5000;
    }
    LevelTransposer.prototype = Object.create(Instance, {
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                var throttle = (actionTime - this.lastActionTime) < 5000;
                switch (trigger) {
                    case "transpose_midi":
                        if (throttle) return;
                        this.transposeValue++;
                        break;
                    case "transpose_midi_reset":
                        this.transposeValue = 0;
                        break;
                }
                this.lastActionTime = actionTime;
            }
        }
    });
    DMAF.registerInstance("customCode", "LevelTransposer", LevelTransposer);
});