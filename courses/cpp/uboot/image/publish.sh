#! /bin/bash

set -e
set -x

docker login docker.pkg.github.com -u github-actions -p ${GITHUB_TOKEN}

IMAGE_VERSION=v1.0.0
IMAGE_TAG=docker.pkg.github.com/github/codeql-learninglab-actions/courses-cpp-uboot:${IMAGE_VERSION}

docker build -t $IMAGE_TAG .

docker push $IMAGE_TAG