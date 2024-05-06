FROM node:14.8.0-alpine
RUN mkdir -p /var/www/superadmin/
COPY package*.json ./var/www/superadmin/
WORKDIR /var/www/superadmin/
RUN npm install -g npm@6.14.7 nodemon
RUN npm install
ENV PATH /var/www/superadmin/node_modules/.bin:$PATH
COPY . .
EXPOSE ${PORT}
CMD ["npm", "run", "server"]
