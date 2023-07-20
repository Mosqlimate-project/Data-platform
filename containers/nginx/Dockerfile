FROM nginx:latest

RUN apt-get update -y \
  && apt-get install -y \
    openssl \
    certbot \
  && rm -rf /var/lib/apt/lists/* \
    /var/cache/apt/archives \
    /tmp/*

RUN rm /etc/nginx/nginx.conf

CMD ["nginx", "-g", "daemon off;"]
