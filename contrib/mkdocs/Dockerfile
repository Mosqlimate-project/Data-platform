FROM squidfunk/mkdocs-material

COPY ./contrib/mkdocs/requirements.txt /tmp/requirements.txt

RUN apk update && apk add \
  build-base \
  linux-headers \
  && pip install -r /tmp/requirements.txt

WORKDIR /root
