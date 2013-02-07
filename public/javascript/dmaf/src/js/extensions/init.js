dmaf.once("load_framework", function DMAFInit(DMAF) {
    var audiocontext = window["AudioContext"] || window["webkitAudioContext"];
    try {
        DMAF.context = new audiocontext();
    } catch (e) {
        return DMAF.failure();
    }
    DMAF.context = new webkitAudioContext();
    dmaf.addEventListener("kick_note", function kicknote () {
        var kick = DMAF.context.createBufferSource(),
            buffer = DMAF.context.createBuffer(1, 100, 44100);
        kick.buffer = buffer;
        kick.noteOn(0);
    });
    DMAF.dispatch("kick_note");
    DMAF.dispatch("load_core", DMAF);
    DMAF.Utils.getFileFormat(DMAF.Settings.formats);
    for (var i = 0, ii = DMAF.Settings.dependencies.length; i < ii; i++) {
        DMAF.dispatch("load_" + DMAF.Settings.dependencies[i], DMAF);
    }
    for (i = 0, ii = DMAF.Settings.actions.length; i < ii; i++) {
        DMAF.ActionManager.createAction(DMAF.Settings.actions[i]);
    }
    checkPreloads();

    function checkPreloads () {
        var preloads = DMAF.ActionManager.triggers.preload_assets;
        checkPreloads.total = 0;
        if (preloads && preloads.length) {
            for (var i = 0, ii = preloads.length; i < ii; i++) {
                checkPreloads.total += preloads[i].actionProperties.files.length;
            }
            dmaf.addEventListener("load_event", readyCheck);
            DMAF.ActionManager.onEvent("preload_assets");
        } else {
            readyCheck(0);
        }
    }
    function readyCheck (leftToLoad, fileName) {
        if (leftToLoad === 0){
            DMAF.ActionManager.onEvent("init_routing");
            DMAF.dispatch("dmaf_ready");
            console.log("dmaf_ready");
            dmaf.active = true;
            dmaf.removeEventListener("load_event", readyCheck);
        }
        var percent = 100 - Math.floor((leftToLoad / checkPreloads.total) * 100);
        DMAF.dispatch("progress_event", percent, fileName);
    }
});