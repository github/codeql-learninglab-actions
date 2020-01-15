#! /bin/bash

# Build the codeql-learninglab-check & course image, and run all queries in
# the course to ensure the expected result
#
# Should be run with the cwd being the course folder

set -e
set -x

TMP=$(mktemp -d -t ci-XXXXXXXXXX)
# Extract the expected parent tag from course Dockerfile
PARENT_TAG=$(head -n 1 image/Dockerfile | awk -F ' ' '{print $2}')
TAG=ci-test

# Build codeql-learninglab-check
docker build -t $PARENT_TAG ../../../codeql-learninglab-check

# Build course image
docker build -t $TAG image

# Prepare temporary folder to mount into docker
mkdir -p $TMP
cp -R answers $TMP/answers
echo "{}" > $TMP/event.json

# Run docker image
docker run -i \
  -e GITHUB_EVENT_NAME=push \
  -e GITHUB_EVENT_PATH=/opt/tmp/event.json \
  -e GITHUB_TOKEN=noop \
  -e RUN_ALL=true \
  -e SKIP_COMMENT=true \
  -v $TMP:/opt/tmp:ro \
  -w /opt/tmp/answers \
  $TAG