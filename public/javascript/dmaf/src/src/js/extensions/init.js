dmaf.once("load_framework", function DMAFInit(DMAF) {
    var audiocontext = window.AudioContext || window.webkitAudioContext,
        preloads;

    if (!audiocontext) return DMAF.failure();
    DMAF.context = new audiocontext();

    function kickNote () {
        var kick = DMAF.context.createBufferSource(),
            buffer = DMAF.context.createBuffer(1, 100, 44100);
        kick.buffer = buffer;
        kick.noteOn(0);
    }
    function dispatchKick () {
        DMAF.dispatch("kick_note");
        document.removeEventListener("touchstart", dispatchKick, false);
    }

    dmaf.addEventListener("kick_note", kickNote);
    document.addEventListener("touchstart", dispatchKick, false);

    DMAF.dispatch("kick_note");
    DMAF.dispatch("load_core", DMAF);
    DMAF.Utils.getFileFormat(DMAF.Settings.formats);

    for (var i = 0, ii = DMAF.Settings.dependencies.length; i < ii; i++) {
        DMAF.dispatch("load_" + DMAF.Settings.dependencies[i], DMAF);
    }
    for (i = 0, ii = DMAF.Settings.actions.length; i < ii; i++) {
        DMAF.ActionManager.createAction(DMAF.Settings.actions[i]);
    }

    preloads = DMAF.ActionManager.triggers.preload_assets;
    if (preloads && preloads.length) {
        dmaf.addEventListener("progress_event", readyCheck);
        DMAF.ActionManager.onEvent("preload_assets");
    } else {
        readyCheck(100);
    }

    function readyCheck (percent) {
        if (percent === 100) {
            DMAF.ActionManager.onEvent("init_routing");
            DMAF.dispatch("dmaf_ready");
            DMAF.ActionManager.onEvent("dmaf_ready");
            console.log("dmaf_ready");
            dmaf.active = true;
            dmaf.removeEventListener("progress_event", readyCheck);
        }
    }
});