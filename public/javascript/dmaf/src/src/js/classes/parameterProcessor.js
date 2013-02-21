dmaf.once("load_parameterProcessor", function (DMAF) {
    var type = "parameterProcessor",
        Super = DMAF.InstancePrototype;

    function Transform (properties) {
        this.timeoutContainer = [];
    }
    Transform.prototype = Object.create(Super, {
        onAction: {
            value: function (trigger, actionTime, eventProperties) {
                if (this.targets.length) {
                    if (this.multiSuffix) {
                        this.targets[0] = trigger.replace(this.multiSuffix, "");
                        this.targets.length = 1;
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
                        console.log("Transforming", this.targetParameter, "of", target.instanceId);
                        target.setProperty(this.targetParameter, this.value, this.duration, actionTime);
                    }
                }
            }
        }
    });
    DMAF.registerInstance(type, "Transform", Transform, true);

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
    DMAF.registerInstance(type, "Macro", Macro);
});