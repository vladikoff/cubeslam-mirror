JADE = $(shell find views/*.jade)
STYLUS=$(wildcard stylesheets/*.styl)
GEOMETRY=$(wildcard lib/geometry/*.obj)
GEOMETRY_JSON=$(GEOMETRY:.obj=.json)
GEOMETRY_JS=$(GEOMETRY:.obj=.js)
SHADERS=$(wildcard lib/shaders/*.glsl)
SHADERS_JS=$(SHADERS:.glsl=.js)
COMPONENT=$(shell find lib -name "*.js" -type f)
COMPONENTS=$(shell find components -name "*.js" -type f)
LANGUAGES=lang/arbs/en.arb lang/arbs/rv.arb
MINIFY=build/build.min.js public/javascript/pong.min.js public/javascript/libs/three.min.js

# adding special cased geometry
GEOMETRY_JS += lib/geometry/terrain3.js lib/geometry/bear.js \
							 lib/geometry/paw.js lib/geometry/rabbit.js \
							 lib/geometry/bird1.js lib/geometry/bird2.js \
							 lib/geometry/bird3.js lib/geometry/bird4.js \
							 lib/geometry/moose.js lib/geometry/terrain.js \
							 lib/geometry/cpu.js

build: build-shaders build-geometry build-component build-styles build-jade build-localization
	@:

build-min: build build/build.min.js
build-shaders: $(SHADERS_JS) lib/shaders/index.js
build-geometry: $(GEOMETRY_JS) lib/geometry/index.js
build-jade: build/build.html
build-component: build/build.js
build-styles: build/build-stylus.css
build-localization: build/localization.arb

prepare-deploy: $(MINIFY)
	@:

deploy-alfred: prepare-deploy
	support/deploy alfredsgame
deploy-einar: prepare-deploy
	support/deploy einarsgame
deploy-goggles: prepare-deploy
	support/deploy gogglesgame
deploy-goggles1: prepare-deploy
	support/deploy gogglesgame1
deploy-webrtc: prepare-deploy
	support/deploy webrtcgame

node_modules/:
	npm install

components/: node_modules
	node_modules/.bin/component-install

lib/shaders/%.js: lib/shaders/%.glsl
	support/str-to-js > $@ < $<

lib/geometry/%.json: lib/geometry/%.obj
	python lib/geometry/convert_obj_three.py -i $< -o $@

lib/geometry/%.js: lib/geometry/%.json
	support/str-to-js > $@ < $<

public/javascript/libs/%.min.js: public/javascript/libs/%.js
	node_modules/.bin/uglifyjs $< -p 3 --source_map_url $(@:public%=%).map --source-map $@.map -c -m --lint -o $@

public/javascript/%.min.js: public/javascript/%.js
	node_modules/.bin/uglifyjs $< -p 2 --source_map_url $(@:public%=%).map --source-map $@.map -c -m --lint > $@

%.min.js: %.js
	node_modules/.bin/uglifyjs $< -p 1 --source-map $@.map -c -m --lint > $@

build/%.html: views/%.jade
	node_modules/.bin/jade < $< --path $< > $@ -P

build/build-stylus.css: $(STYLUS)
	node_modules/.bin/stylus --use nib < stylesheets/screen.styl --include-css -I stylesheets > $@

build/build.js: components $(COMPONENTS) $(COMPONENT) component.json
	node_modules/.bin/component-build

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
	@echo 'You need to `cp $< $@` and modify the server name and root.'
	@echo
	@echo '  SERVER_ROOT: ${PWD}'
	@echo
	@exit 1

proxy: server.conf
	mkdir -p /tmp/nginx/pong
	ln -sf "${PWD}/server.conf" /tmp/nginx/pong/server.conf
	nginx -s reload || nginx
	dev_appserver.py -a 0.0.0.0 -c -p 8081 .


.SUFFIXES:
.PHONY: clean clean-geometry clean-localization \
				build build-min build-shaders build-styles \
				build-geometry build-component build-localization \
				prepare-deploy deploy-webrtc deploy-goggles1 deploy-goggles deploy-einar deploy-alfred
