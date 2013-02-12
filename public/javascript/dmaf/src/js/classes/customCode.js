dmaf.once("load_customCode", function load_Actions (DMAF) {
    var type = "customCode",
        Super = DMAF.InstancePrototype;
    function CustomCode () {}
    CustomCode.prototype = Object.create(Super);
    DMAF.registerInstance("customCode", "CustomCode", CustomCode);
    DMAF.customCode.CustomCode.createInstance = function (properties) {
        if (DMAF.customCode[properties.instanceId]) {
            var instance = DMAF.customCode[properties.instanceId].createInstance(properties);
            return instance;
        } else {
            console.log(properties.instanceId, "was not registered with DMAF");
        }
    };

    function UserObject () {}
    UserObject.prototype = Object.create(Super, {
        onAction: {
            value: function (trigger, actionTime, eventProperties, actionProperties) {
                var obj = DMAF.pendingObjects[this.instanceId];
                if (instance) {
                    this.obj = obj;
                }
            }
        }
    });
    DMAF.registerInstance("customCode", "UserObject", UserObject);
});