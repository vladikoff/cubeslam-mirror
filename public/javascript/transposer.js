dmaf.once("load_custom", function (DMAF) {
    function LevelTransposer () {
        this.transposeValue = 0;
    }
    LevelTransposer.prototype = Object.create(DMAF.InstancePrototype, {
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                switch (trigger) {
                    case "user_won_round":
                        this.transposeValue++;
                        break;
                    case "user_lost_round":
                        this.transposeValue++;
                        break;
                    case "user_won_match":
                        this.transposeValue = 0;
                        break;
                    case "user_lost_match":
                        this.transposeValue = 0;
                        break;
                }
            }
        }
    });
    DMAF.registerInstance("customCode", "LevelTransposer", LevelTransposer);
});