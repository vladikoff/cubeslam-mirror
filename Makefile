JADE = $(shell find views/*.jade)
STYLES=$(wildcard styles/*.less)
STYLUS=stylesheets/screen.styl
GEOMETRY=$(wildcard lib/geometry/*.obj)
GEOMETRY_JSON=$(GEOMETRY:.obj=.json)
GEOMETRY_JS=$(GEOMETRY:.obj=.js)
SHADERS=$(wildcard lib/shaders/*.glsl)
SHADERS_JS=$(SHADERS:.glsl=.js)
COMPONENT=$(shell find lib -name "*.js" -type f)
COMPONENTS=$(shell find components -name "*.js" -type f)
LANGUAGES=lang/arbs/en.arb lang/arbs/rv.arb

# adding special cased geometry
GEOMETRY_JS += lib/geometry/terrain3.js lib/geometry/bear.js lib/geometry/rabbit.js lib/geometry/bird1.js lib/geometry/bird2.js lib/geometry/bird3.js lib/geometry/bird4.js lib/geometry/moose.js lib/geometry/terrain.js

build: build-shaders build-geometry build-component build-jade build-stylus build-localization
	@:

build-min: build build/build.min.js
build-shaders: $(SHADERS_JS) lib/shaders/index.js
build-geometry: $(GEOMETRY_JS) lib/geometry/index.js
build-jade: build/build.html
build-component: build/build.js
build-styles: build/build-less.css
build-stylus: build/build-stylus.css
build-localization: build/localization.arb

components:
	node_modules/.bin/component-install

lib/shaders/%.js: lib/shaders/%.glsl
	support/str-to-js > $@ < $<

lib/geometry/%.json: lib/geometry/%.obj
	python lib/geometry/convert_obj_three.py -i $< -o $@

lib/geometry/%.js: lib/geometry/%.json
	support/str-to-js > $@ < $<

%.min.js: %.js
	node_modules/.bin/uglifyjs $< > $@

build/%.html: views/%.jade
	node_modules/.bin/jade < $< --path $< > $@ -P

build/build-less.css: $(STYLES)
	node_modules/.bin/lessc $(STYLES) > $@

build/build-stylus.css: $(STYLUS)
	stylus --use nib < $(STYLUS) --include-css -I stylesheets > $@

build/build.js: components $(COMPONENTS) $(COMPONENT) component.json
	node_modules/.bin/component-build

lang/arbs/rv.arb: lang/arbs/en.arb
	node lang/rovarspraketizer.js > $@ < $<

lang/arbs/%.arb: template.html
	node lang/langparse.js > $@ < $<

build/localization.arb: $(LANGUAGES)
	cat lang/arbs/*.arb > build/localization.arb

clean: clean-geometry clean-localization
	rm -Rf build/ components/ $(SHADERS_JS)

clean-localization:
	rm -Rf $(LANGUAGES)

clean-geometry:
	rm -Rf $(GEOMETRY_JS) $(GEOMETRY_JSON)

.SUFFIXES:
.PHONY: clean clean-geometry clean-localization \
				build build-min build-shaders build-styles build-geometry build-component build-localization
