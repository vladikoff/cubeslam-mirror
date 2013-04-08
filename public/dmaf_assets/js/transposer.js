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