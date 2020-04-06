#! /bin/bash

set -e
set -x

docker login docker.pkg.github.com -u github-actions -p ${GITHUB_TOKEN}

IMAGE_VERSION=0.0.1
IMAGE_TAG=docker.pkg.github.com/github/codeql-learninglab-actions/courses-cpp-<course-name>:${IMAGE_VERSION}
IMAGE_TAG_LATEST=docker.pkg.github.com/github/codeql-learninglab-actions/courses-cpp-<course-name>:latest

docker build -t $IMAGE_TAG -t $IMAGE_TAG_LATEST .

docker push $IMAGE_TAG
docker push $IMAGE_TAG_LATEST