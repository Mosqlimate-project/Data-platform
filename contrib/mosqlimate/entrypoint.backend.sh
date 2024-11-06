#!/usr/bin/env bash

set -ex

# prepare the conda environment
is_conda_in_path=$(echo $PATH | grep -m 1 --count /opt/conda/)

if [ $is_conda_in_path == 0 ]; then
  export PATH="/opt/conda/condabin:/opt/conda/bin:$PATH"
  echo "export PATH=\"/opt/conda/condabin:/opt/conda/bin:\$PATH\"" >>~/.bashrc
  echo "[II] included conda to the PATH"
fi

{
  echo "source activate mosqlimate"
} >>~/.bashrc

echo "[II] activate mosqlimate"
source activate mosqlimate

poetry run ./manage.py collectstatic --noinput

set +ex

if [ $# -ne 0 ]; then
  echo "Running: ${@}"
  ${@}
fi
