#!/bin/sh
sed -i.tmp 's/application: .*/application: gogglesgame/' app.yaml
appcfg.py update .
