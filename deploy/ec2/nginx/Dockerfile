FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build


FROM nginx:1.27-alpine

RUN apk add --no-cache apache2-utils openssl

COPY --from=frontend-build /app/dist/ /usr/share/nginx/html/
COPY deploy/ec2/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY deploy/ec2/nginx/10-orion-auth.sh /docker-entrypoint.d/10-orion-auth.sh

RUN chmod +x /docker-entrypoint.d/10-orion-auth.sh

