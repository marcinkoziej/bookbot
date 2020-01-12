FROM movonw/nightmarejs

RUN apt-get update && \
    ( apt-get install -y postgresql-client \
        --no-install-recommends; true ) \
    && apt-get autoclean \
    && apt-get clean \
    && rm -rf /var/lib/api/lists/*

WORKDIR /app

ADD . /app

RUN  npm install

ENTRYPOINT ["/usr/bin/xvfb-run"]

CMD ["npm", "run", "nb-snapper", "--", "-c", "-R", "-D", "-S", "0 0 18 * * *", "-F", "0 0 20 * * *"]

