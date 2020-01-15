#! /bin/bash

# Test that the queries in ../answers produce the expected results

set -e
set -x

TMP=$PWD/tmp
TAG=ci-test

docker login docker.pkg.github.com -u github-actions -p ${GITHUB_TOKEN}

docker build -t $TAG .


mkdir -p $TMP
cp -R ../answers $TMP/answers

# Create event file
cat <<EOT > tmp/event.json
{
}
EOT

docker run -i \
  -e GITHUB_EVENT_NAME=push \
  -e GITHUB_EVENT_PATH=/opt/tmp/event.json \
  -e GITHUB_TOKEN=noop \
  -e RUN_ALL=true \
  -e SKIP_COMMENT=true \
  -v $TMP:/opt/tmp:ro \
  -w /opt/tmp/answers \
  $TAG