#! /bin/bash

set -e
set -x

docker login docker.pkg.github.com -u github-actions -p ${GITHUB_TOKEN}

IMAGE_VERSION=0.0.1
IMAGE_TAG=docker.pkg.github.com/github/codeql-learninglab-actions/courses-javascript-unsafe-jquery:${IMAGE_VERSION}
IMAGE_LATEST_TAG=docker.pkg.github.com/github/codeql-learninglab-actions/courses-javascript-unsafe-jquery:latest

docker build -t $IMAGE_TAG -t $IMAGE_LATEST_TAG .

docker push $IMAGE_TAG
docker push $IMAGE_LATEST_TAG