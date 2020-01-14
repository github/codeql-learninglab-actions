#! /bin/bash

set -e
set -x

docker login docker.pkg.github.com -u github-actions -p ${GITHUB_TOKEN}

docker build -t ci-test .