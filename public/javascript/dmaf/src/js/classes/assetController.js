dmaf.once("load_assetController", function (DMAF) {
    var type = "assetController",
        Super = Object.create(DMAF.InstancePrototype, {
            init: {
                value: function () {
                    this.loadCount = 0;
                }
            },
            onload: {
                value: function () {
                    if (this.returnEvent) {
                        DMAF.dispatch(this.returnEvent);
                    }
                    DMAF[this.type][this.id].removeInstance(this.instanceId);
                }
            },
            onstep: {
                value: function () {
                    var percent = 100 - Math.floor((--Assets.loadsInProgress / Assets.loadTotals[this.task]) * 100);
                    if (percent !== Assets.loadPercents[this.task]) {
                        DMAF.dispatch("progress_event", percent, this.fileNames[this.loadCount] + this.format);
                        Assets.loadPercents[this.task] = percent;
                    }
                    if (++this.loadCount === this.fileNames.length) {
                        this.onload();
                    }
                }
            },
            onAction: {
                value: function (trigger) {
                    if (this.inProgress) {
                        return; //Prevent loader from firing more than once.
                    }
                    Assets.listenForLoads(trigger);
                    this.task = trigger;
                    this.fileNames = this.files.map(fixFilesArray);
                    Assets.loadsInProgress += this.fileNames.length;
                    this.inProgress = true;
                    for (var i = 0, ii = this.fileNames.length; i < ii; i++) {
                        this.loadFile(this.baseURL + this.fileNames[i] + this.format, this.fileNames[i], i);
                    }
                }
            }
        }),
        Assets = {
            beatPattern: {},
            sampleMap: {},
            buffer: {},
            timePattern: {},
            loadsInProgress: 0,
            loadTotals: {},
            loadPercents: {},
            listenForLoads: function (trigger) {
                if (this.loadTotals[trigger] !== undefined) return;
                var loads = DMAF.ActionManager.triggers[trigger];
                if (!loads.length) return;
                loads = loads.slice(0).filter(function (el) {
                    return el.type = type;
                });
                this.loadTotals[trigger] = 0;
                this.loadPercents[trigger] = 0;
                for (i = 0, ii = loads.length; i < ii; i++) {
                    this.loadTotals[trigger] += loads[i].actionProperties.files.length;
                }
            }
        };
    if (dmaf.dev) window.Assets = Assets;
    DMAF.getAsset = function (type, id) {
        if (Assets[type] && Assets[type][id]) {
            return Assets[type][id];
        } else {
            console.log("DMAF.getAsset: Couldn't find asset", type, id);
            return null;
        }
    };
    DMAF.setAsset = function (type, id, asset) {
        if (Assets[type]) {
            Assets[type][id] = asset;
        } else {
            console.log("DMAF.getAsset: Couldn't set asset", type, id);
            return null;
        }
    };

    if (DMAF.Processor) {
        Assets.beatPattern.empty_pattern = new DMAF.Processor.BeatPattern('empty_pattern', 1);
    }

    function LoadCustomCode () {}
    LoadCustomCode.prototype = Object.create(Super, {
        format: {value: ".js"},
        loadFile: {
            value: function (path, name, index) {
                var loader = this,
                    elem = document.createElement("script");
                elem.type = "text/javascript";
                elem.src = path;
                elem.addEventListener("load", function () {
                    DMAF.dispatch("load_custom", DMAF);
                    loader.onstep();
                    if (elem.remove !== undefined) {
                        elem.remove();
                    }
                });
                document.body.appendChild(elem);
            }
        }
    });
    DMAF.registerInstance(type, "LoadCustomCode", LoadCustomCode);

    function LoadSampleMap () {}
    LoadSampleMap.prototype = Object.create(Super, {
        format: {
            value: ".xml"
        },
        loadFile: {
            value: function (path, name, index) {
                var options = {
                    chain: [this.onstep],
                    context: this,
                    responseXML: true,
                    fail: function () {
                        console.log("Problem parsing samplemap file");
                        this.onstep();
                    }
                };
                function sampleMapXMLSuccess (response) {
                    DMAF.parse("samplemap", response);
                }
                DMAF.Utils.ajax(path, sampleMapXMLSuccess, options);
            }
        }
    });
    DMAF.registerInstance(type, "LoadSampleMap", LoadSampleMap);

    function LoadMIDI () {}
    LoadMIDI.prototype = Object.create(Super, {
        format: {
            value: ".mid"
        },
        loadFile: {
            value: function (path, name, index) {
                var midiAjaxOpt = {
                        override: "text/plain; charset=x-user-defined",
                        expectType: "string",
                        context: this,
                        fail: function () {
                            console.log("Problem parsing midi file", path);
                            this.onstep();
                        }
                    };
                function midixmlsuccess (response) {
                    DMAF.parse("midi", response, this.files[index].type, name);
                    this.onstep();
                }
                DMAF.Utils.ajax(path, midixmlsuccess, midiAjaxOpt);
            }
        }
    });
    DMAF.registerInstance(type, "LoadMIDI", LoadMIDI);

    function LoadSound () {}
    LoadSound.prototype = Object.create(Super, {
        loadFile: {
            value: function (url, name) {
                var ajaxOptions = {
                    responseType: "arraybuffer",
                    fail: fail.bind(this)
                },
                ondecode = function (buffer) {
                    Assets.buffer[name] = buffer;
                    this.onstep();
                }.bind(this),
                decodeError = function (e) {
                    console.log("Could not decode file", name, e);
                    this.onstep();
                }.bind(this);

                function success (arraybuffer) {
                    DMAF.context.decodeAudioData(arraybuffer, ondecode, decodeError);
                }
                function fail () {
                    console.log("Could not load audio file", name, "url:", url);
                    this.onstep();
                }
                DMAF.Utils.ajax(url, success, ajaxOptions, "buffer");
            }
        },
        format: {
            value: DMAF.fileFormat
        }
    });
    DMAF.registerInstance(type, "LoadSound", LoadSound);

    //Corrects file array from list of objects to strings
    function fixFilesArray (item) {
        return item.name;
    }
    function onerror (e) {
        console.error("DMAF error Loading Asset ", e);
    }
});