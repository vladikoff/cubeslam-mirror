#!/bin/sh
sed -i.tmp 's/application: .*/application: einarsgame/' app.yaml

# use python instead of the python-2.5 that is hard coded in appcfg.
# or ssl won't work on osx.
python `which appcfg.py` update .
