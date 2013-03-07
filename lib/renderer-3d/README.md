
How to hack component to use the 3d renderer separately:

1. Build it

    component build

2. Remove the require stuff on top of build.js

    sed -i -e 1,208d build/build.js

3. Add some magic aliases to html

    require.alias("renderer-3d/index.js", "paddle-battle/lib/renderer-3d/index.js");
    require.alias("visionmedia-debug/index.js", "renderer-3d/deps/debug/index.js");
    require.alias("component-jquery/index.js", "renderer-3d/deps/jquery/index.js");
    require.alias("publicclass-geom/index.js", "renderer-3d/deps/geom/index.js");
    require.alias("publicclass-stash/index.js", "renderer-3d/deps/stash/index.js");
    require.alias("paddle-battle/lib/settings.js", "renderer-3d/settings/index.js");
    require.alias("paddle-battle/lib/actions/index.js", "renderer-3d/actions/index.js");
    require.alias("paddle-battle/lib/sim/body-flags.js", "renderer-3d/sim/body-flags/index.js");
    require.alias("paddle-battle/lib/world.js", "renderer-3d/world/index.js");
    require.alias("paddle-battle/lib/support/improved-noise.js", "renderer-3d/improved-noise/index.js");
