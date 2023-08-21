# Base stage for common dependencies
FROM ubuntu:20.04 AS base

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=0

RUN 	ln -fs /usr/share/zoneinfo/America/New_York /etc/localtime && \
   	apt-get update && \
	 	apt-get install -y tzdata && \
	 	dpkg-reconfigure tzdata

# Build stage for installing dependencies
FROM base AS builder
RUN 	apt-get install -y x11vnc xvfb  zip wget curl psmisc supervisor gconf-service libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-bin libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils libgbm-dev nginx libcurl3-gnutls && \
    fc-cache -f -v

RUN curl --silent --location https://deb.nodesource.com/setup_18.x | bash - &&\
    apt-get -y -qq install nodejs &&\
    apt-get -y -qq install build-essential &&\
    apt-get -qq clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

RUN wget https://d2qz0zcp53gaw.cloudfront.net/orbita-browser-latest.tar.gz -O /tmp/orbita-browser.tar.gz

# Gologin installation
RUN cd /tmp && tar -xzf /tmp/orbita-browser.tar.gz -C /usr/bin && rm -f /tmp/orbita-browser.tar.gz

RUN groupadd -r orbita && useradd -r -g orbita -s/bin/bash -G audio,video -p $(echo 1 | openssl passwd -1 -stdin) orbita  \
  && mkdir -p /home/orbita/Downloads \
  && chown -R orbita:orbita /home/orbita \
  && mkdir -p /home/orbita/.gologin/browser

RUN echo 'orbita ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers

COPY fonts /home/orbita/.gologin/browser/fonts
COPY orbita.conf /etc/nginx/conf.d/orbita.conf

RUN chmod 777 /var/lib/nginx /var/log /run -R && usermod -a -G sudo orbita

# Copy stage for copying necessary files
FROM builder AS copy

COPY package.json pnpm-lock.yaml /opt/orbita/
WORKDIR /opt/orbita
# Enable corepack and install packages
RUN npm install -g corepack && corepack enable && pnpm install

COPY . .

RUN pnpm postinstall

# Runtime stage for the final image
FROM copy AS runtime

COPY entrypoint.sh /entrypoint.sh

RUN chmod 777 /entrypoint.sh \
                            	&& mkdir /tmp/.X11-unix \
                            	&& chmod 1777 /tmp/.X11-unix

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:4000/health || exit 1

USER orbita
ENTRYPOINT ["/entrypoint.sh"]