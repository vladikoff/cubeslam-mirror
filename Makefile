
STYLES=$(wildcard styles/*.less)
LOCALIZATIONS=$(wildcard lang/arbs/*.arb)
GEOMETRY=$(wildcard lib/geometry/*.obj)
GEOMETRY_JSON=$(GEOMETRY:.obj=.json)
GEOMETRY_JS=$(GEOMETRY:.obj=.js)
SHADERS=$(wildcard lib/shaders/*.glsl)
SHADERS_JS=$(SHADERS:.glsl=.js)
COMPONENT=$(shell find lib -name "*.js" -type f)
COMPONENTS=$(shell find components -name "*.js" -type f)

build: build-shaders build-geometry build-component build-styles build-localization
	@:

build-min: build build/build.min.js

build-shaders: $(SHADERS_JS) lib/shaders/index.js

build-geometry: $(GEOMETRY_JS) lib/geometry/bear.js lib/geometry/index.js

build-component: build/build.js

build-styles: build/build-less.css

build-localization: lang/arbs/en.arb lang/arbs/rö.arb build/localization.arb

components:
	node_modules/.bin/component-install

lib/shaders/%.js: lib/shaders/%.glsl
	cat $< | support/str-to-js > $@

lib/geometry/%.json: lib/geometry/%.obj
	python lib/geometry/convert_obj_three.py -i $< -o $@

lib/geometry/%.js: lib/geometry/%.json
	cat $< | support/str-to-js > $@

%.min.js: %.js
	node_modules/.bin/uglifyjs $< > $@

build/build-less.css: $(STYLES)
	node_modules/.bin/lessc $(STYLES) > $@

build/build.js: components $(COMPONENTS) $(COMPONENT) component.json
	node_modules/.bin/component-build

lang/arbs/en.arb: template.html
	cat template.html | node lang/langparse.js >lang/arbs/en.arb

lang/arbs/rö.arb: lang/arbs/en.arb
	cat lang/arbs/en.arb | node lang/rovarspraketizer.js > lang/arbs/rö.arb

build/localization.arb: $(LOCALIZATIONS)
	cat lang/arbs/*.arb > build/localization.arb

clean-geometry:
	rm -Rf $(GEOMETRY_JS) $(GEOMETRY_JSON)

clean: clean-geometry
	rm -Rf build/ components/ $(SHADERS_JS)

.SUFFIXES:
.PHONY: clean build build-min build-shaders build-styles build-geometry build-component clean-geometry
