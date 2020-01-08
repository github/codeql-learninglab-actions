## Contributing

[fork]: https://github.com/github/codeql-learninglab-actions/fork
[pr]: https://github.com/github/codeql-learninglab-actions/compare
[style]: https://github.com/styleguide/ruby
[code-of-conduct]: CODE_OF_CONDUCT.md

Hi there! We're thrilled that you'd like to contribute to this project. Your help is essential for keeping it great.

Contributions to this project are [released](https://help.github.com/articles/github-terms-of-service/#6-contributions-under-repository-license) to the public under the [project's open source license](LICENSE.md).

Please note that this project is released with a [Contributor Code of Conduct][code-of-conduct]. By participating in this project you agree to abide by its terms.

## Submitting a pull request

0. [Fork][fork] and clone the repository
0. Configure and install the dependencies: `script/bootstrap`
0. Make sure the tests pass on your machine: `rake`
0. Create a new branch: `git checkout -b my-branch-name`
0. Make your change, add tests, and make sure the tests still pass
0. Push to your fork and [submit a pull request][pr]
0. Pat your self on the back and wait for your pull request to be reviewed and merged.

Here are a few things you can do that will increase the likelihood of your pull request being accepted:

- Write tests.
- Keep your change as focused as possible. If there are multiple changes you would like to make that are not dependent upon each other, consider submitting them as separate pull requests.
- Write a [good commit message](http://tbaggery.com/2008/04/19/a-note-about-git-commit-messages.html).

## Resources

- [How to Contribute to Open Source](https://opensource.guide/how-to-contribute/)
- [Using Pull Requests](https://help.github.com/articles/about-pull-requests/)
- [GitHub Help](https://help.github.com)

## Updating and Releasing

### :whale: `codeql-learninglab-check` docker image

The top-level dependency is the
[`codeql-learninglab-check`](codeql-learninglab-check) docker image.
To update its dependencies,
or release a new version of it,
please see [the README for that docker image](codeql-learninglab-check).

### Courses included in the `courses/` directory

Following changes to the [`codeql-learninglab-check`](codeql-learninglab-check)
base docker image,
you'll likely want to update each of the individual courses to use the latest
version.
(This will be neccesary for users to take advantage of the latest changes to
the CodeQL libraries or tools).
You can do this by updating the `FROM` line in the respective `Dockerfile`.

Changes to the courses,
including changes to the `Dockerfile`,
the configuration,
or any of the expected results `.csv` files are automatically published when
pushes are made to `master`.
This is done by the respective `publish.sh` file for each course.

We generally want to ensure that we always push the version `latest` so that
changes can immediately be used by all course participants,
and we don't need to update any references to versions elsewhere.
