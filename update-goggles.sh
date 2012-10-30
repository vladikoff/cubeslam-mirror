#!/bin/sh
sed -i 's/application: .*/application: gogglesgame/' app.yaml
appcfg.py update .
