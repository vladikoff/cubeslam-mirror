var settings = require('./settings')
    , $ = require('jquery');

function Themes() {

    this.white = 0xedecd6
    //this.white = 0xf9f9db

    this.currentThemeIndex = 0;
    this.list = [

        //only used as initiator in settings
        new Theme({}),

        //level 1
        new Theme({name:"default"}),

        //green
        new Theme({
            name:"green",
            puckColor: 0xffda00,
            arenaColor: 0xcdb380,
            terrainColor1: 0x036564,
            terrainColor2: 0x033649,
            terrainColor3: 0x033649,
            treeBranchColor: 0x031634,
            iconColor: 0xffda00,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,

            countdown1:'#ef0505',
            countdown2:'#19b9b7',
        }),

        //purple
        new Theme({
            name:"purple",
            puckColor: 0xffda00,
            arenaColor: 0xb38184,
            terrainColor1: 0x73626e,
            terrainColor2: 0x413e4a,
            terrainColor3: 0x413e4a,
            treeBranchColor: 0x413e4a,
            iconColor: 0xffda00,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,

            countdown1:'#b38184',
            countdown2:'#413e4a',
        }),

        //pastell
        new Theme({
            name:"pastell",
            puckColor: 0xffda00,
            arenaColor: 0xcc2a41,
            terrainColor1: 0x64908a,
            terrainColor2: 0x424254,
            terrainColor3: 0x351330,
            treeBranchColor: 0x424254,
            iconColor: 0x04c4c7f,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,

            countdown1:'#cc2a41',
            countdown2:'#015c50',
        }),


        //pink
        new Theme({
            name:"pink",
            puckColor: 0xffda00,
            arenaColor: 0x5e9fa3,
            terrainColor1: 0xdcd1b4,
            terrainColor2: 0xb05574,
            terrainColor3: 0xb6ac90,
            treeBranchColor: 0xb65957,
            iconColor: 0xffda00,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,
            darken: true,

            countdown1:'#b05574',
            countdown2:'#5e9fa3',

        }),

        //light
        new Theme({
            name:"light",
            puckColor: 0xffda00,
            arenaColor: 0xab526b,
            terrainColor1: 0xf4ebc3,
            terrainColor2: 0xbca297,
            terrainColor3: 0xbca297,
            treeBranchColor: 0xc5ceae,
            iconColor: 0x4c4c7f,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,
            darken: true,

            countdown1:'#bca297',
            countdown2:'#c5ceae',
        }),

        //pastell green
        new Theme({
            name:"pastell green",
            puckColor: 0xffda00,
            arenaColor: 0x3c3251,
            terrainColor1: 0xa8d46f,
            terrainColor2: 0x3c3251,
            terrainColor3: 0x341139,
            treeBranchColor: 0x359668,
            iconColor: 0x4c4c7f,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,

            countdown1:'#cc2a41',
            countdown2:'#359668',
        }),


        //orange
        new Theme({
            name:"orange",
            puckColor: 0xffda00,
            arenaColor: 0x3b8183,
            terrainColor1: 0xff9c5b,
            terrainColor2: 0xf5634a,
            terrainColor3: 0xed303c,
            treeBranchColor: 0xed303c,
            iconColor: 0xffda00,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,

            countdown1:'#911921',
            countdown2:'#3b8183',
        }),


        //forrest green
        new Theme({
            name:"forrest",
            puckColor: 0xffda00,
            arenaColor: 0xa32c28,
            terrainColor1: 0x384030,
            terrainColor2: 0x2b3124,
            terrainColor3: 0x1d2217,
            treeBranchColor: 0x7b8055,
            iconColor: 0xffda00,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,
            countdown1:'#a32c28',
            countdown2:'#7b8055',

        }),

        //black horizon
        new Theme({
            name:"black horizon",
            puckColor: 0xffda00,
            arenaColor: 0xe32f21,
            terrainColor1: 0xabccbd,
            terrainColor2: 0x181619,
            terrainColor3: 0x181619,
            treeBranchColor: 0x7dbeb8,
            iconColor: 0xffda00,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,
            darken: true,
            countdown1:'#e32f21',
            countdown2:'#7dbeb8',

        }),

        //red horizon
        new Theme({
            name:"red horizon",
            puckColor: 0xffda00,
            arenaColor: 0xc84648,
            terrainColor1: 0xd3c8b4,
            terrainColor2: 0x703e3b,
            terrainColor3: 0x703e3b,
            treeBranchColor: 0x703e3b,
            iconColor: 0xffda00,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12,
            darken:true,
            countdown1:'#703e3b',
            countdown2:'#456942',

        })

    ]

    this.current = this.list[this.currentThemeIndex];

}

Themes.prototype = {
    next: function(){
        this.currentThemeIndex++

        this.goto(this.currentThemeIndex)
    },

    goto: function(index) {

        if( index >= this.list.length-1 ) {
            //rewind until index in range. Might be good if there are hundreds of levels and a few themes
            while( index >= this.list.length-1 ) index -= this.list.length;

            if( index < 0 ) index = 0;
        }

        this.current = this.list[index+1];

        var scores = $("#scores");
        var extras = $("#extras ul");

        if(this.current.darken) {
           scores.find("h1,h2,h3,p").addClass("ui-darken")
           scores.find("li,li:before").addClass("ui-darken")
           extras.addClass("ui-darken")

        }
        else {
           scores.find("h1,h2,h3,p").removeClass("ui-darken")
           scores.find("li").removeClass("ui-darken")
           extras.removeClass("ui-darken")

        }

        settings.changeTheme(this.current);

    }
}

module.exports = new Themes();

function Theme( mixin ) {

    this.name = "";
    this.treeTrunkColor =  0x206cc3;
    this.shieldColor =  0xffffff;
    this.puckColor =  0xefce06;
    this.arenaColor =  0xeb2020;
    this.terrainColor1 =  0x146ccf;
    this.terrainColor2 =  0x0a71b9;
    this.terrainColor3 =  0x196189;
    this.treeBranchColor =  0x206cc3;
    this.iconColor =  0xefce06;
    this.cpuBackdropColor =  0x0e0e0d;
    this.gridBrightness = 0.1
    this.darken = false
    this.countdown1 = '#e83129'
    this.countdown2 = '#40a040'

    if( mixin ) {
        for( var key in mixin ) {
            if( this.hasOwnProperty(key) ){
                this[key] = mixin[key];
            }
        }
    }
}

