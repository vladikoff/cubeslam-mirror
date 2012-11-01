var debug = require('debug')('audio');

var audio = exports;

audio.library = {};

audio.init = function(soundList) {
    //create sound-effects

    try {
        var testContext = new webkitAudioContext();
        audio.isAvailable = true;
        
    } catch( error ) {
        audio.isAvailable = false;
        console.warn( "webkitAudioContext not found" );
        return false;
    }

    //load effects
    if( soundList ){
        for (var i=0; i < soundList.length; i++) {
            var item = soundList[i];
            audio.add(item);
        }
    }
}

audio.add = function( params ) {

    var soundFx = new SoundFX();
    soundFx.pitch = params.pitch;
    soundFx.loop = params.loop;
    soundFx.volume = params.volume;
    soundFx.load(params.url);

    this.library[params.id] = soundFx;
    debug("added", soundFx);
    return soundFx;
}

audio.play = function( id ) {
    
    if( audio.isAvailable ) {
        var sample = this.library[id];
        if( sample ) {
            sample.play();
        }
    }
}

audio.play3D = function( id ,pos) {
    if( audio.isAvailable ) {
        var sample = this.library[id];
        if( sample ) {
            sample.panner.setPosition(pos.x, pos.y, pos.z);
            sample.play();
        }
    }
}

function SoundFX( ){

    this.loaded = false;
    this.context = new webkitAudioContext();

    this.buffer = null;
    this.gainNode = this.context.createGainNode();
    this.panner = this.context.createPanner();
    
}

SoundFX.prototype.play = function(){


    if( !this.loaded ) {

        var scope = this;
        setTimeout(function(){
            scope.play();
        },2000)
        return;
    }

    this.source = this.context.createBufferSource(); // creates a sound source
    this.source.buffer = this.buffer;                    // tell the source which sound to play
    
    this.gainNode.gain.value = this.volume;

    this.source.loop = this.loop;

    this.source.connect(this.panner);
    this.panner.connect(this.gainNode);
    this.gainNode.connect(this.context.destination);
    // connect the source to the context's destination (the speakers)
    
    if( this.pitch == "random") {
        this.source.playbackRate.value = Math.random()*1+0.2
    }
    
    this.source.noteOn(0);
}

SoundFX.prototype.stop = function(){
    this.source.noteOff(0);
}


SoundFX.prototype.load = function(url){
    // Load asynchronously
    var request = new XMLHttpRequest();
    request.open("GET", url, true);
    request.responseType = "arraybuffer";

    var scope = this

    request.onload = function(e) {

        debug('loaded',e)

        if(scope.context.decodeAudioData) {
            scope.context.decodeAudioData(request.response, function(buffer) {
                scope.buffer = buffer;
                scope.loaded = true;
            }, function(e) {
                console.warn("Can't decode sample",e);
            });
        } else {
            
            scope.source.buffer = scope.context.createBuffer(this.response, true /*mixToMono*/);
        }
    }

    request.send();
}





