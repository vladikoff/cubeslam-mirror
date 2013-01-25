Chrome Pong (working title)
===========================


## Building

  **Requirements:**

  * python (2.7.2 tested)
  * node (0.8.x tested)
  * make (GNU Make 3.81 tested, should come with xcode dev tools on mac)

  Building is done using a `Makefile` which in turn uses `npm` and `component` for packages and `jade` and `stylus` for templating.

  But to get started all you have to do it make sure `python` and `node` is installed and then:

    $ make

  While developing I'd recommend using [watch](http://github.com/visionmedia/watch) so you don't have to keep running that command manually. The Makefile is set up to only run whenever something changes.


## Testing

  **Requirements:**

  * Go App Engine (`brew install go-app-engine-64`)

  To get it up and running on a local machine the app engine dev server must be up and running. Start it with:

    $ dev_appserver.py .

