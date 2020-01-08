# :whale: `codeql-learninglab-check`

This is the docker image used as the base for query-checking actions used by
CodeQL Learning Lab courses,
and it is [published to GitHub
Packages](https://github.com/github/codeql-learninglab-actions/packages/95228).

## Usage

For instructions on how to use this docker image, please see
[Creating your own course](../README.md#creating-your-own-course)
in the main README.

## Architecture / Components

This docker image bundles a number of elements:

* **Dependency:** Some debian packages, importantly including Node v12.
* **Dependency:** The CodeQL CLI binaries from
  [`codeql-cli-binaries`](https://github.com/github/codeql-cli-binaries/releases)
* **Dependency:** A checkout of the [`Semmle/ql`](https://github.com/Semmle/ql)
  repository, pinned to a specific version.
* The core action JavaScript/TypeScript code from [`package/`](package),
  and all its NPM dependencies.

## Updating the CodeQL dependencies

You will want to make sure that the versions of the CodeQL CLI and `Semmle/ql`
are compatible.

* **Updating the CodeQL CLI**: Modify the URL for the CLI in
  [`Dockerfile`](Dockerfile).
* **Updating the `Semmle/ql` repo**: Update the `RUN git checkout <ref>` line in
  [`Dockerfile`](Dockerfile) to a git sha / reference that is compatible with
  the version of the CodeQL CLI that is in use.

## Releasing

After making changes to any of the elements of this docker image,
including the source code in `package/`,
for courses to make use of these changes you need to make a release.

This repository has a GitHub Actions workflow configured on pushes to `master`
to automatically publish the image
using the script [`publish.sh`](publish.sh).
It will check to see if an image has already been published for the current
version,
and if not it will build and publish the image automatically.
So to publish a new version,
simply change the `IMAGE_VERSION` variable in [`publish.sh`](publish.sh),
and push to `master`.

**Note: it's probably best to avoid publishing to `latest` so that courses have
to specify an explicit as their base images,
so that courses won't break unexpectedly with breaking changes to this image**

### Updating downstream dependencies

Once you have updated this base image,
you probably want to also update a number of the courses to use this updated
image.

See the main
[CONTRIBUTING.md](../CONTRIBUTING.md#courses-included-in-the-courses-directory)
file for more info.
