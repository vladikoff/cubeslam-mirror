dmaf.once("load_custom", function (DMAF) {

    function LevelTransposer () {
        this.transposeValue = 0;
        this.lastActionTime = -5000;
    }
    LevelTransposer.prototype = Object.create(DMAF.InstancePrototype, {
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                var throttle = actionTime - this.lastActionTime < 5000;
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
                console.groupCollapsed("TRANSPOSE LEVEL IS NOW", this.transposeValue);
                console.groupEnd();
            }
        }
    });
    DMAF.registerInstance("customCode", "LevelTransposer", LevelTransposer);
});