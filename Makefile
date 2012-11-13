GEOMETRY=$(wildcard lib/geometry/*.json)
GEOMETRY_JS=$(GEOMETRY:.json=.js)
SHADERS=$(wildcard lib/shaders/*.glsl)
SHADERS_JS=$(SHADERS:.glsl=.js)
COMPONENT=$(shell find lib/ -name "*.js" -type f)

build: build-shaders build-geometry build-component

build-shaders: $(SHADERS_JS) lib/shaders/index.js
	@ #silent

build-geometry: $(GEOMETRY_JS) lib/geometry/index.js
	@ #silent

build-component: components/ $(COMPONENT) component.json
	@component-build

components/:
	component-install

lib/shaders/%.js: lib/shaders/%.glsl
	cat $< | support/str-to-js > $@

lib/geometry/%.js: lib/geometry/%.json
	cat $< | support/str-to-js > $@

%.min.js: %.js
	uglifyjs $< > $@

clean: 
	rm -Rf build/

.PHONY: clean build build-shaders build-component