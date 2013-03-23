
// makes renderer-css available in core
require.alias("renderer-css/index.js", "paddle-battle/lib/renderer-css/index.js");

// makes core dependencies available in renderer-css
require.alias("visionmedia-debug/index.js", "renderer-css/deps/debug/index.js");
require.alias("component-jquery/index.js", "renderer-css/deps/jquery/index.js");
require.alias("publicclass-stash/index.js", "renderer-css/deps/stash/index.js");
require.alias("ecarter-css-emitter/index.js", "renderer-css/deps/css-emitter/index.js");

// these are accessible at parent level in renderer-css
require.alias("paddle-battle/lib/settings.js", "settings/index.js");
require.alias("paddle-battle/lib/actions/index.js", "actions/index.js");
require.alias("paddle-battle/lib/world.js", "world/index.js");
require.alias("paddle-battle/lib/support/pool.js", "support/pool/index.js");
