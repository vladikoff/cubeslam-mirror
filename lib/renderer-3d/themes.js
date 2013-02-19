var settings = require('../settings')

function Themes() {

    this.currentThemeIndex = 0;
    this.list = [
        new Theme(),
        new Theme({
            puckColor: 0xefce06,
            arenaColor: 0x000000,
            terrainColor1: 0x146ccf,
            terrainColor2: 0x0a71b9,
            terrainColor3: 0x196189,
            treeBranchColor: 0x206cc3,
            iconColor: 0xefce06   
        }),
        new Theme({
            puckColor: 0,
            arenaColor: 0,
            terrainColor1: 0,
            terrainColor2: 0,
            terrainColor3: 0,
            treeBranchColor: 0,
            iconColor: 0
        })
    ]

    this.current = this.list[this.currentThemeIndex];
    
}

Themes.prototype = {
    next: function(){
        this.currentThemeIndex++ 

        if( this.currentThemeIndex > this.list.length ) this.currentThemeIndex = 0;

        this.goto(this.currentThemeIndex)
    },

    goto: function(index) {
        
        if( index > this.list.length ) index = this.list.length-1;

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

