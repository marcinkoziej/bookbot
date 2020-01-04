FROM movonw/nightmarejs

RUN apt-get update && \
    ( apt-get install -y postgresql-client \
        --no-install-recommends; true ) \ # ignore man page gen error...
    && apt-get autoclean \
    && apt-get clean \
    && rm -rf /var/lib/api/lists/*

WORKDIR /app

ADD . /app

RUN  npm install

CMD [ "xvfb-run", "npm", "run", "nb-snapper", "--", "-c", "-R", "-D", "-S", "0 0 18 * * *", "-F", "0 0 20 * * *" ]

