FROM node:14.8.0-alpine
RUN mkdir -p /var/www/insurance/
COPY package*.json ./var/www/insurance/
WORKDIR /var/www/insurance/
RUN npm install -g npm@6.14.7 nodemon
RUN npm install
ENV PATH /var/www/insurance/node_modules/.bin:$PATH

RUN apk add --no-cache \
      chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
COPY . .
EXPOSE ${PORT}
CMD ["npm", "run", "server"]