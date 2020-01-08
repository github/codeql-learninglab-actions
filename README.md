# Actions for Learning Lab CodeQL Courses

This repository provides Docker images and GitHub Actions
for use in CodeQL courses
on [Learning Lab](https://lab.github.com/).

These actions allow you to specify workflows
that can check that course participants' queries are correct,
by running their queries against a well-known CodeQL database,
and checking the results are as expected.
Whatever the outcome,
the action will post a comment on the commit which was pushed
to add the queries.

When a user's results are incorrect,
the comment will include details of which results are missing,
and which are superfluous,
including links to the lines of source code on GitHub when possible:

**Screenshot:**

![](docs/comment_screenshot.png)

## Creating your own course

There are two main components to any Learning Lab course for CodeQL that uses
the components in this repository:

* **Query Checking Action:**

  Each course has its own GitHub Action that is designed to be used in workflows
  that run when a course participant pushes new commits to their repo.
  The action will check which queries have changed in the push,
  and run the queries that it recognizes as part of the course
  (based on the filename).

  After running the queries,
  the action will check the results against a CSV file of expected results.
  It will then post a comment on the commit,
  detailing whether each query produced the correct results or not.
  And if not,
  it will include details of which results are missing,
  and which results are unexpected.

  These actions are bundled using Docker,
  and made available using
  [GitHub Packages](https://github.com/features/packages).

* **Learning Lab Course:**

  This is the course itself.
  It creates the initial repository the participant will use for their course,
  posts instructions as GitHub issues,
  and listens for comments posted by the GitHub action to know when the user
  has completed the current task correctly,
  and is ready to advance to the next one.

### Creating a GitHub Action

TODO

### Contributing your GitHub Action to this repository

TODO

## Example Courses

* [GitHub Security Lab CTF 1: SEGV hunt](courses/cpp/ctf-segv)

Feel free to add your own courses to this list!
See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

The code in this repository is licensed under MIT (see [LICENSE.md](LICENSE.md)),
however as it makes use of the CodeQL CLI,
usage of this repository is subject to the
[GitHub CodeQL Terms and Conditions](https://securitylab.github.com/tools/codeql/license),
(whenever your usage involves the CodeQL CLI).

In particular,
you are not permitted to use these docker images or actions
to interact with the CodeQL CLI in CI/CD,
as per the [terms & conditions](https://securitylab.github.com/tools/codeql/license):

> **the Software cannot be used** ... **For automated analysis, continuous integration or continuous delivery, whether as part of normal software engineering processes or otherwise.**

