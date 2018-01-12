FROM  pichlermi/docker-electron


WORKDIR /bookbot

USER 0
RUN apt install -y xvfb
USER 1000

ADD --chown=1000 . /bookbot

RUN  npm install

# EXPOSE 3000

CMD [ "xvfb-run", "npm", "start" ]
