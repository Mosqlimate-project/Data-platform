FROM condaforge/mambaforge:latest

USER root

SHELL ["/bin/bash", "-c"]

ENV ENV_NAME=mosqlimate
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=America/Sao_Paulo
ARG UID
ARG GID

RUN apt-get update -y \
  && apt-get install -y \
    apt-utils \
    build-essential \
    curl \
    nginx \
    tini \
    sudo \
    tzdata \
    openssl \
  && rm -rf /var/lib/apt/lists/* \
    /var/cache/apt/archives \
    /tmp/*

RUN addgroup --gid ${GID} mosqlimate \
  && useradd --uid ${UID} --gid ${GID} -ms /bin/bash mosqlimate \
  && mkdir -p /opt/services/mosqlimate \
  && chmod -R a+rwx /opt/conda /opt/services \
  && chown mosqlimate:mosqlimate /opt/services \
  && export ENV_NAME="$ENV_NAME" \
  && echo "mosqlimate ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/mosqlimate \
  && chmod 0440 /etc/sudoers.d/mosqlimate

USER mosqlimate

WORKDIR /opt/services/mosqlimate

COPY --chown=mosqlimate:mosqlimate ./conda/ /tmp/conda

RUN mamba env create -n $ENV_NAME -f /tmp/conda/base.yaml \
  && conda clean --all \
  && find /opt/conda/ -type f,l -name '*.pyc' -delete \
  && find /opt/conda/ -type f,l -name '*.js.map' -delete \
  && rm -rf /opt/conda/pkgs /tmp/*

ENV CONDA_PREFIX /opt/conda/envs/$ENV_NAME
ENV PATH ${CONDA_PREFIX}/bin:$PATH

# install dependencies
COPY --chown=mosqlimate:mosqlimate pyproject.toml /opt/services/mosqlimate

# https://github.com/yaml/pyyaml/issues/724
RUN pip install "cython<3.0.0" \
  && pip install --no-build-isolation "pyyaml<6.0" \ 
  && poetry config virtualenvs.create false \
  && poetry install --no-root

COPY --chown=mosqlimate:mosqlimate containers/entrypoint.sh /opt/entrypoint.sh
ADD --chown=mosqlimate:mosqlimate src/ /opt/services/mosqlimate/

RUN chmod +x /opt/entrypoint.sh \
  && echo "source /opt/entrypoint.sh" > ~/.bashrc

ARG STATIC_ROOT
ARG DJANGO_CONTAINER_DATA_PATH
ENV STATIC_ROOT ${STATIC_ROOT}
ENV DJANGO_CONTAINER_DATA_PATH ${DJANGO_CONTAINER_DATA_PATH}
RUN mkdir -p ${DJANGO_CONTAINER_DATA_PATH} \
  && mkdir -p ${STATIC_ROOT}/.well-known/acme-challenge

ENV PYTHONPATH='/opt/services/mosqlimate'

ENTRYPOINT ["tini", "--", "/opt/entrypoint.sh"]
CMD ["python", "manage.py", "runserver", "0.0.0.0:8042"]
