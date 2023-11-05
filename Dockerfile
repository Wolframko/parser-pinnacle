FROM consol/debian-xfce-vnc:nightly
ENV REFRESHED_AT 2023-11-23


USER 0
RUN set -uex; \
    apt-get update; \
    apt-get install -y ca-certificates curl gnupg; \
    mkdir -p /etc/apt/keyrings; \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
     | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg; \
    NODE_MAJOR=18; \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" \
     > /etc/apt/sources.list.d/nodesource.list; \
    apt-get -qy update; \
    apt-get -qy install nodejs openssl unzip zip sudo;


RUN corepack enable

RUN mkdir /opt/project
RUN chown 1000 /opt/project

RUN apt-get -qq clean && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# USER 1000
RUN curl -fsSL https://bun.sh/install | bash
# WORKER INSTALL
COPY package.json /opt/project/package.json

COPY index.ts /opt/project/index.ts
ADD ./types/ /opt/project/types/

WORKDIR /opt/project

RUN pnpm i