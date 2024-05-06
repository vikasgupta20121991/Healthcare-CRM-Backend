FROM node:14.8.0-alpine
RUN mkdir -p /var/www/gateway/
COPY package*.json ./var/www/gateway/
WORKDIR /var/www/gateway
RUN npm install -g npm@6.14.7 nodemon
RUN npm install
ENV PATH /var/www/gateway/node_modules/.bin:$PATH
COPY . .
EXPOSE ${PORT}
CMD ["npm", "run", "server"]