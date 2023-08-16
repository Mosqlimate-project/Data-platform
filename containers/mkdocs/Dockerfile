FROM squidfunk/mkdocs-material

COPY ./containers/mkdocs/requirements.txt /tmp/requirements.txt

RUN apk update && \
    pip install -r /tmp/requirements.txt

WORKDIR /root
