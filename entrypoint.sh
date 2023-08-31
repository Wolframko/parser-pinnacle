#!/bin/bash

bash /dockerstartup/vnc_startup.sh --wait &
cd /opt/orbita
sleep 3
node --inspect=0.0.0.0 index.js
