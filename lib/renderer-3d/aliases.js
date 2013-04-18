
// makes renderer-3d available in core
require.alias("renderer-3d/index.js", "slam/lib/renderer-3d/index.js");

// makes core dependencies available in renderer-3d
require.alias("component-emitter/index.js", "renderer-3d/deps/emitter/index.js");
require.alias("visionmedia-debug/index.js", "renderer-3d/deps/debug/index.js");
require.alias("component-jquery/index.js", "renderer-3d/deps/jquery/index.js");
require.alias("publicclass-geom/index.js", "renderer-3d/deps/geom/index.js");
require.alias("publicclass-stash/index.js", "renderer-3d/deps/stash/index.js");
require.alias("publicclass-request-animation-frame/index.js", "renderer-3d/deps/request-animation-frame/index.js");

// these are accessible at parent level in renderer-3d
require.alias("slam/lib/settings.js", "settings/index.js");
require.alias("slam/lib/themes.js", "themes/index.js");
require.alias("slam/lib/actions/index.js", "actions/index.js");
require.alias("slam/lib/sim/body-flags.js", "sim/body-flags/index.js");
require.alias("slam/lib/world.js", "world/index.js");
require.alias("slam/lib/support/improved-noise.js", "improved-noise/index.js");
require.alias("slam/lib/support/pool.js", "support/pool/index.js");

require.alias("slam/lib/dmaf.min.js", "dmaf.min/index.js");