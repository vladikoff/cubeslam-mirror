#!/bin/sh
sed -i.tmp 's/application: .*/application: einarsgame/' app.yaml
appcfg.py update .
