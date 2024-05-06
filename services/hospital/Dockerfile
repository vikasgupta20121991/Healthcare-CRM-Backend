FROM node:14.8.0-alpine
RUN mkdir -p /var/www/hospital/
COPY package*.json ./var/www/hospital/
WORKDIR /var/www/hospital
RUN npm install -g npm@6.14.7 nodemon
RUN npm install
ENV PATH /var/www/hospital/node_modules/.bin:$PATH
COPY . .
EXPOSE ${PORT}
CMD ["npm", "run", "server"]