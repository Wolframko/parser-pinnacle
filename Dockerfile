# This Dockerfile is used to build an headles vnc image based on Debian

FROM node:18-slim

RUN corepack enable

# WORKER INSTALL
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
COPY package.json /opt/orbita/package.json
RUN cd /opt/orbita &&\
	pnpm install


COPY index.js /opt/orbita/index.js
COPY influxdata.js /opt/orbita/influxdata.js
COPY before-shutdown.js /opt/orbita/before-shutdown.js
RUN mkdir /opt/orbita/prisma 
ADD prisma/ /opt/orbita/prisma/

WORKDIR /opt/orbita

RUN npx prisma generate

CMD [ "pnpm", "start" ]