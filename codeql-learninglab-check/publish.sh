#! /bin/bash

set -e
set -x

docker login docker.pkg.github.com -u github-actions -p ${GITHUB_TOKEN}

IMAGE_VERSION=v0.0.2
IMAGE_TAG=docker.pkg.github.com/github/codeql-learninglab-actions/codeql-learninglab-check:${IMAGE_VERSION}

if docker pull $IMAGE_TAG; then
  echo "image tag already exist, skipping..."
else
  echo "image has not yet been published. building and publishing..."

  docker build -t $IMAGE_TAG .

  docker push $IMAGE_TAG
fi