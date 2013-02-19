var settings = require('../settings')

function Themes() {

    this.currentThemeIndex = 0;
    this.list = [

        //only used as initiator in settings
        new Theme({}),

        //level 1
        new Theme({}),
        
        //green
        new Theme({
            puckColor: 0xffda00,
            arenaColor: 0xcdb380,
            terrainColor1: 0x036564,
            terrainColor2: 0x033649,
            terrainColor3: 0x033649,
            treeBranchColor: 0x031634,
            iconColor: 0xef0505,
            cpuBackdropColor:0x234369,
            gridBrightness: 0.12   
        }),

        //purple
        new Theme({
            puckColor: 0xffda00,
            arenaColor: 0xb38184,
            terrainColor1: 0x073626e,
            terrainColor2: 0x413e4a,
            terrainColor3: 0x413e4a,
            treeBranchColor: 0x413e4a,
            iconColor: 0xbe3434,
            cpuBackdropColor:0x234369,
            gridBrightness: 0.12   
        }),

        //pastell
        new Theme({
            puckColor: 0xffda00,
            arenaColor: 0xcc2a41,
            terrainColor1: 0x64908a,
            terrainColor2: 0x424254,
            terrainColor3: 0x351330,
            treeBranchColor: 0x424254,
            iconColor: 0x04c4c7f,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12   
        }),

        //light
        new Theme({
            puckColor: 0xffda00,
            arenaColor: 0xab526b,
            terrainColor1: 0xf4ebc3,
            terrainColor2: 0xbca297,
            terrainColor3: 0xbca297,
            treeBranchColor: 0xc5ceae,
            iconColor: 0x4c4c7f,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12   
        }),

        //pastell green
        new Theme({
            puckColor: 0xffda00,
            arenaColor: 0x3c3251,
            terrainColor1: 0xa8d46f,
            terrainColor2: 0x3c3251,
            terrainColor3: 0x341139,
            treeBranchColor: 0x359668,
            iconColor: 0x4c4c7f,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12   
        }),

        //orange
        new Theme({
            puckColor: 0xffda00,
            arenaColor: 0x3c3251,
            terrainColor1: 0xa8d46f,
            terrainColor2: 0x3c3251,
            terrainColor3: 0x341139,
            treeBranchColor: 0x359668,
            iconColor: 0x4c4c7f,
            cpuBackdropColor:0x000000,
            gridBrightness: 0.12   

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
        
        if( index > this.list.length ) index = 0;

        this.current = this.list[index];

        settings.changeTheme(this.current);

    }
}

module.exports = new Themes();

function Theme( mixin ) {

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

    if( mixin ) {
        for( key in mixin ) {
            if( this.hasOwnProperty(key) ){
                this[key] = mixin[key];
            }
        }
    }
}

