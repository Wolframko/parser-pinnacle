# This Dockerfile is used to build an headles vnc image based on Debian

FROM node:lts-bullseye-slim

## Connection ports for controlling the UI:
# VNC port:5901
# noVNC webport, connect via http://IP:6901/?password=vncpassword
ENV DISPLAY=:1 \
    VNC_PORT=5901 \
    NO_VNC_PORT=6901
EXPOSE $VNC_PORT $NO_VNC_PORT

### Envrionment config
ENV HOME=/headless \
    TERM=xterm \
    STARTUPDIR=/dockerstartup \
    INST_SCRIPTS=/headless/install \
    NO_VNC_HOME=/headless/noVNC \
    DEBIAN_FRONTEND=noninteractive \
    VNC_COL_DEPTH=24 \
    VNC_RESOLUTION=1920x1080 \
    VNC_PW=vncpassword \
    VNC_VIEW_ONLY=false
WORKDIR $HOME

### Add all install scripts for further steps
ADD ./docker-headless-vnc-container/src/common/install/ $INST_SCRIPTS/
ADD ./docker-headless-vnc-container/src/debian/install/ $INST_SCRIPTS/

### Install some common tools
RUN $INST_SCRIPTS/tools.sh
ENV LANG='en_US.UTF-8' LANGUAGE='en_US:en' LC_ALL='en_US.UTF-8'

### Install custom fonts
RUN $INST_SCRIPTS/install_custom_fonts.sh

### Install xvnc-server & noVNC - HTML5 based VNC viewer
RUN $INST_SCRIPTS/tigervnc.sh
RUN $INST_SCRIPTS/no_vnc.sh

### Install IceWM UI
RUN $INST_SCRIPTS/icewm_ui.sh
ADD ./docker-headless-vnc-container/src/debian/icewm/ $HOME/

### configure startup
RUN $INST_SCRIPTS/libnss_wrapper.sh
ADD ./docker-headless-vnc-container/src/common/scripts $STARTUPDIR
RUN $INST_SCRIPTS/set_user_permission.sh $STARTUPDIR $HOME

RUN 	apt-get update &&\
	 	apt-get install -y zip wget curl psmisc supervisor gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-bin libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils libgbm-dev libcurl3-gnutls

RUN     corepack enable &&\
		fc-cache -f -v

RUN wget https://d2qz0zcp53gaw.cloudfront.net/orbita-browser-latest.tar.gz -O /tmp/orbita-browser.tar.gz

# GOLOGIN INSTALL
RUN cd /tmp &&\
	tar -xzf /tmp/orbita-browser.tar.gz -C /usr/bin &&\
	rm -f /tmp/orbita-browser.tar.gz

RUN apt-get -qq clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# WORKER INSTALL
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
COPY package.json /opt/orbita/package.json
RUN cd /opt/orbita &&\
	pnpm install

RUN mkdir -p /headless/.gologin/browser
COPY fonts /headless/.gologin/browser/fonts


COPY index.js /opt/orbita/index.js
COPY influxdata.js /opt/orbita/influxdata.js
COPY before-shutdown.js /opt/orbita/before-shutdown.js
RUN mkdir /opt/orbita/prisma 
ADD prisma/ /opt/orbita/prisma/
COPY entrypoint.sh /entrypoint.sh

RUN	 chmod 777 /entrypoint.sh 

WORKDIR /opt/orbita
RUN pnpm run postinstall

ENTRYPOINT ["/entrypoint.sh"]