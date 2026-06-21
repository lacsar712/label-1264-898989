FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmmirror.com
RUN npm install

COPY . .

ENV NODE_ENV=production
EXPOSE 8000

CMD ["npm", "start"]
