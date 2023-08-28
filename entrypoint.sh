#!/bin/bash

bash /dockerstartup/vnc_startup.sh --wait &
cd /opt/orbita
sleep 3
node index.js
