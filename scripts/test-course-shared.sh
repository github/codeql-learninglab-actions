#! /bin/bash

# Build the course image, and run all queries in
# the course to ensure the expected result
#
# Should be run with the cwd being the course folder

set -e
set -x

TMP=$(mktemp -d -t ci-XXXXXXXXXX)
TAG=ci-test

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