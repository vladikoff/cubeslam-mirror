#!/bin/sh
sed -i 's/application: .*/application: einarsgame/' app.yaml
appcfg.py update .
