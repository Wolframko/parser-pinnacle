# This Dockerfile is used to build an headles vnc image based on Debian

FROM oven/bun:alpine



# WORKER INSTALL
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
COPY package.json /opt/orbita/package.json
RUN cd /opt/orbita &&\
	bun install


COPY index.js /opt/orbita/index.js
COPY influxdata.js /opt/orbita/influxdata.js
COPY before-shutdown.js /opt/orbita/before-shutdown.js
RUN mkdir /opt/orbita/prisma 
ADD prisma/ /opt/orbita/prisma/

WORKDIR /opt/orbita

CMD [ "bun", "start" ]