LIB = $(shell find lib -name "*.js" -type f | sort)

all: app.min.js
	@: # silence

clean:
	rm app.js
	rm app.min.js

app.js: $(LIB)
	node_modules/.bin/browserbuild -d -b lib/ -m app $(LIB) > $@

app.min.js: app.js
	node_modules/.bin/uglifyjs < $< > $@

.PHONY: all clean