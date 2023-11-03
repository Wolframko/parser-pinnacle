FROM consol/debian-xfce-vnc:nightly
ENV REFRESHED_AT 2023-11-23


USER 0
RUN apt-get install -y curl \
  && curl -sL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y nodejs openssl unzip zip sudo
RUN corepack enable

RUN mkdir /opt/project
RUN chown 1000 /opt/project

RUN wget https://d2qz0zcp53gaw.cloudfront.net/orbita-browser-latest.tar.gz -O /tmp/orbita-browser.tar.gz
# GOLOGIN INSTALL
RUN cd /tmp &&\
	tar -xzf /tmp/orbita-browser.tar.gz -C /usr/bin &&\
	rm -f /tmp/orbita-browser.tar.gz

RUN apt-get -qq clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# USER 1000
RUN curl -fsSL https://bun.sh/install | bash
# WORKER INSTALL
COPY package.json /opt/project/package.json

COPY index.ts /opt/project/index.ts
ADD ./types/ /opt/project/types/

WORKDIR /opt/project

RUN pnpm i