JADE = $(shell find views/*.jade)
STYLUS=$(wildcard stylesheets/*.styl)
GEOMETRY=$(wildcard lib/renderer-3d/geometry/*.obj)
GEOMETRY_JSON=$(GEOMETRY:.obj=.json)
GEOMETRY_JS=$(GEOMETRY:.obj=.js)
SHADERS=$(wildcard lib/renderer-3d/shaders/*.glsl)
SHADERS_JS=$(SHADERS:.glsl=.js)
LIB=$(shell find lib -name "*.js" -type f)
LIB_3D=$(shell find lib/renderer-3d -name "*.js" -type f)
LIB_CSS=$(shell find lib/renderer-css -name "*.js" -type f)
COMPONENTS=$(shell find components -name "*.js" -type f)
LANGUAGES=lang/arbs/en.arb lang/arbs/rv.arb
MINIFY=build build/build-3d.min.js public/javascript/slam.min.js public/javascript/renderer-3d.min.js public/javascript/renderer-css.min.js public/javascript/libs/three.min.js build/build.min.js

REQUIRE_LINES=$(shell wc -l < node_modules/component/node_modules/component-builder/node_modules/component-require/lib/require.js | tr -d ' ')

DEV?=--dev
DEBUG?=true

# adding special cased geometry
GEOMETRY_JS += lib/renderer-3d/geometry/terrain3.js lib/renderer-3d/geometry/bear.js \
							 lib/renderer-3d/geometry/paw.js lib/renderer-3d/geometry/rabbit.js \
							 lib/renderer-3d/geometry/bird1.js lib/renderer-3d/geometry/bird2.js \
							 lib/renderer-3d/geometry/bird3.js lib/renderer-3d/geometry/bird4.js \
							 lib/renderer-3d/geometry/moose.js lib/renderer-3d/geometry/terrain3.js \
							 lib/renderer-3d/geometry/cpu.js

build: build-shaders build-geometry build-component build-styles build-jade build-localization build-renderer
	@:

build-min: build $(MINIFY)
build-renderer: build/build-3d.js build/build-css.js
build-shaders: $(SHADERS_JS) lib/renderer-3d/shaders/index.js
build-geometry: $(GEOMETRY_JS) lib/renderer-3d/geometry/index.js
build-jade: build/build.html
build-component: build/build.js
build-styles: build/build-stylus.css
build-localization: build/localization.arb
force-build:
	touch lib/app.js
	touch lib/renderer-3d/index.js
	touch lib/renderer-css/index.js

prepare-deploy: DEV=
prepare-deploy: DEBUG=false
prepare-deploy: force-build $(MINIFY)
	@:

deploy-alfred: prepare-deploy
	support/deploy alfredsgame $(v)
deploy-einar: prepare-deploy
	support/deploy einarsgame $(v)
deploy-goggles: prepare-deploy
	support/deploy gogglesgame $(v)
deploy-goggles1: prepare-deploy
	support/deploy gogglesgame1 $(v)
deploy-webrtc: prepare-deploy
	support/deploy webrtcgame $(v)

node_modules/:
	npm install

components/: node_modules
	node_modules/.bin/component-install

lib/renderer-3d/shaders/%.js: lib/renderer-3d/shaders/%.glsl
	support/str-to-js > $@ < $<

lib/renderer-3d/geometry/%.json: lib/renderer-3d/geometry/%.obj
	python lib/renderer-3d/geometry/convert_obj_three.py -i $< -o $@ -x 100.0

lib/renderer-3d/geometry/%.js: lib/renderer-3d/geometry/%.json
	support/str-to-js > $@ < $<

# we don't really use build.min.js so
# this is a trick to make the prepare-deploy
# task much faster
build/build.min.js: build/build.js
	touch $@

public/javascript/libs/%.min.js: public/javascript/libs/%.js
	node_modules/.bin/uglifyjs $< -p 3 --source_map_url $(@:public%=%).map --source-map $@.map -c -m --lint -d DEBUG=$(DEBUG) -o $@

public/javascript/%.min.js: public/javascript/%.js
	node_modules/.bin/uglifyjs $< -p 2 --source_map_url $(@:public%=%).map --source-map $@.map -c -m --lint -d DEBUG=$(DEBUG) > $@

%.min.js: %.js
	node_modules/.bin/uglifyjs $< -p 1 --source-map $@.map -c -m --lint > $@

build/%.html: views/%.jade
	node_modules/.bin/jade < $< --path $< > $@ -P

build/build-stylus.css: $(STYLUS)
	node_modules/.bin/stylus --use nib < stylesheets/screen.styl --include-css -I stylesheets > $@

build/build-3d.js: $(LIB_3D) $(GEOMETRY_JS) $(SHADERS_JS)
	@# the 1,208 sed script removes the require.js part
	(cd lib/renderer-3d && ../../node_modules/.bin/component build && sed -e 1,$(REQUIRE_LINES)d build/build.js | cat - aliases.js) > $@

build/build-css.js: $(LIB_CSS)
	@# the 1,208 sed script removes the require.js part
	(cd lib/renderer-css && ../../node_modules/.bin/component build && sed -e 1,$(REQUIRE_LINES)d build/build.js | cat - aliases.js) > $@

build/build.js: components $(COMPONENTS) $(LIB) component.json
	node_modules/.bin/component-build $(DEV)

lang/arbs/rv.arb: lang/arbs/en.arb
	node lang/rovarspraketizer.js > $@ < $<

lang/arbs/%.arb: build/build.html
	node lang/langparse.js > $@ < $<

build/localization.arb: $(LANGUAGES)
	cat lang/arbs/*.arb > build/localization.arb

clean: clean-geometry clean-localization
	rm -Rf build/ components/ $(SHADERS_JS)

clean-localization:
	rm -Rf $(LANGUAGES)

clean-geometry:
	rm -Rf $(GEOMETRY_JS) $(GEOMETRY_JSON)

server.conf: server.conf.sample
	@echo
	@echo 'You need to create a `./server.conf`. Run this command to get started:'
	@echo
	@echo '  sed "s|SERVER_ROOT|$$(PWD)|g" server.conf.sample > server.conf'
	@echo
	@echo 'Then run `make proxy` again to start the server.'
	@echo
	@exit 1

proxy: server.conf
	mkdir -p /tmp/nginx/pong
	ln -sf "${PWD}/server.conf" /tmp/nginx/pong/server.conf
	nginx -s reload || nginx
	dev_appserver.py --use_sqlite  -a 0.0.0.0 -c -p 8081 .


.SUFFIXES:
.PHONY: proxy clean clean-geometry clean-localization \
				build build-min build-shaders build-styles force-build \
				build-geometry build-component build-localization \
				prepare-deploy deploy-webrtc deploy-goggles1 deploy-goggles deploy-einar deploy-alfred
