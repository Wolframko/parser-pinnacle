FROM consol/debian-xfce-vnc:nightly
ENV REFRESHED_AT 2023-11-23


USER 0
RUN apt-get install -y curl \
  && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y nodejs openssl
RUN corepack enable

RUN mkdir /opt/project
RUN chown 1000 /opt/project
USER 1000



# WORKER INSTALL
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=true
COPY package.json /opt/project/package.json
RUN cd /opt/project &&\
	pnpm install


COPY index.js /opt/project/index.js
COPY influxdata.js /opt/project/influxdata.js
COPY before-shutdown.js /opt/project/before-shutdown.js
RUN mkdir /opt/project/prisma 
ADD prisma/ /opt/project/prisma/

WORKDIR /opt/project

RUN npx prisma generate
