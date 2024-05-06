FROM node:14.8.0-alpine
RUN mkdir -p /var/www/pharmacy/
COPY package*.json ./var/www/pharmacy/
WORKDIR /var/www/pharmacy/
RUN npm install -g npm@6.14.7 nodemon
RUN npm install
ENV PATH /var/www/pharmacy/node_modules/.bin:$PATH
COPY . .
EXPOSE ${PORT}
CMD ["npm", "run", "server"]