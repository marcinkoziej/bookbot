FROM movonw/nightmarejs

WORKDIR /app

ADD . /app

RUN  npm install

# EXPOSE 3000

CMD [ "xvfb-run", "npm", "run", "nb-snapper", "--", "-c", "-R", "-D" ]

