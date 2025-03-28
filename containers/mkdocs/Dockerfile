FROM squidfunk/mkdocs-material

RUN mkdir /root/docs

COPY ./containers/mkdocs/requirements.txt /tmp/requirements.txt
COPY ./containers/mkdocs/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

RUN apk update && apk add \
  wget \
  build-base \
  linux-headers \
  && pip install -r /tmp/requirements.txt

WORKDIR /root
