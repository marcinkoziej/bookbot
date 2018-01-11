FROM node:alpine

WORKDIR /usr/src/app

ADD . /usr/src/app 

RUN npm install

# EXPOSE 3000

CMD [ "npm", "start" ]
