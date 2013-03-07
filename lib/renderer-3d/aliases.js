
// makes renderer-3d available in core
require.alias("renderer-3d/index.js", "paddle-battle/lib/renderer-3d/index.js");

// makes core dependencies available in renderer-3d
require.alias("visionmedia-debug/index.js", "renderer-3d/deps/debug/index.js");
require.alias("component-jquery/index.js", "renderer-3d/deps/jquery/index.js");
require.alias("publicclass-geom/index.js", "renderer-3d/deps/geom/index.js");
require.alias("publicclass-stash/index.js", "renderer-3d/deps/stash/index.js");

// these are accessible at parent level in renderer-3d
require.alias("paddle-battle/lib/settings.js", "settings/index.js");
require.alias("paddle-battle/lib/themes.js", "themes/index.js");
require.alias("paddle-battle/lib/actions/index.js", "actions/index.js");
require.alias("paddle-battle/lib/sim/body-flags.js", "sim/body-flags/index.js");
require.alias("paddle-battle/lib/world.js", "world/index.js");
require.alias("paddle-battle/lib/support/improved-noise.js", "improved-noise/index.js");
require.alias("paddle-battle/lib/dmaf.min.js", "dmaf.min/index.js");