FROM node:14.8.0-alpine
RUN mkdir -p /var/www/labimagingdentaloptical/
COPY package*.json ./var/www/labimagingdentaloptical/
WORKDIR /var/www/labimagingdentaloptical
RUN npm install -g npm@6.14.7 nodemon
RUN npm install
ENV PATH /var/www/labimagingdentaloptical/node_modules/.bin:$PATH
COPY . .
EXPOSE ${PORT}
CMD ["npm", "run", "server"]