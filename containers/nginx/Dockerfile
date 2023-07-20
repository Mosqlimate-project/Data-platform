FROM nginx:latest

RUN apt-get update -y \
  && apt-get install -y \
    openssl \
    certbot \
    python3-certbot-nginx \
  && rm -rf /var/lib/apt/lists/* \
    /var/cache/apt/archives \
    /tmp/*

RUN rm /etc/nginx/nginx.conf

CMD ["nginx", "-g", "daemon off;"]
