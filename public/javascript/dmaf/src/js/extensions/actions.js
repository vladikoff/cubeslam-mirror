dmaf.once("load_core", function load_Actions (DMAF) {
    var stop = false;
    DMAF.ActionManager = {
        triggers: {},
        addAction: function (action) {
            var trigger;
            for (var i = 0, ii = action.triggers.length; i < ii; i++) {
                trigger = action.triggers[i];
                this.triggers[trigger] = this.triggers[trigger] || [];
                this.triggers[trigger].push(action);
                action.zindex = this.triggers[trigger].length;
            }
        },
        stop: function () {
            stop = true;
        },
        onEvent: function (trigger, eventTime, eventProperties) {
            var actions = this.triggers[trigger],
                actionTime = eventTime || DMAF.context.currentTime * 1000,
                delay;
            stop = false;
            //console.log(trigger, ~~(DMAF.context.currentTime * 1000));
            if (!actions || !actions.length) return;
            for (var i = 0, ii = actions.length; i < ii; i++) {
                delay = actions[i].delay ? actions[i].delay : 0;
                actions[i].execute(trigger, actionTime + delay, eventProperties);
                if (stop) break;
            }
        },
        createAction: function (data) {
            if (!DMAF[data.type] || !DMAF[data.type][data.id]) {
                console.log("DMAF Could not find module of type", data.type, "with id", data.id,
                    "check the config.xml to make sure you've included this module.");
                return;
            }
            this.addAction(new Action(data));
        }
    };
    function Action (data) {
        this.actionProperties = data.actionProperties;
        this.triggers = data.triggers;
        this.delay = data.delay || 0;
        this.type = data.type;
        this.id = data.id;
        this.multi = this.actionProperties.instanceId === "multi";
    }
    Action.prototype = {
        execute: function (trigger, actionTime, eventProperties) {
            var instance,
                instanceId,
                instanceProperties;

            instanceId = this.multi ? trigger : this.actionProperties.instanceId;
            instance = DMAF.getInstance(this.type, instanceId || "no_instance_id");
            if (!instance) {
                instanceProperties = DMAF.Utils.clone(this.actionProperties);
                instanceProperties.instanceId = instanceId;
                instanceProperties.type = this.type;
                instanceProperties.id = this.id;
                instance = DMAF[this.type][this.id].createInstance(instanceProperties);
            } else if (instance._dynamicValues) {
                instance.setDynamicValues();
            }
            instance.onAction(trigger, actionTime, eventProperties, this.actionProperties);
        }
    };
});