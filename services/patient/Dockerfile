FROM node:14.8.0-alpine
RUN mkdir -p /var/www/patient/
COPY package*.json ./var/www/patient/
WORKDIR /var/www/patient/
RUN npm install -g npm@6.14.7 nodemon
RUN npm install
ENV PATH /var/www/patient/node_modules/.bin:$PATH
COPY . .
EXPOSE ${PORT}
CMD ["npm", "run", "server"]