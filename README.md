# Actions for Learning Lab CodeQL Courses

[![](https://github.com/github/codeql-learninglab-actions/workflows/CI/badge.svg)](https://github.com/github/codeql-learninglab-actions/actions?query=workflow%3ACI)
[![](https://github.com/github/codeql-learninglab-actions/workflows/Build%20and%20publish%20docker%20images%20to%20registry/badge.svg)](https://github.com/github/codeql-learninglab-actions/actions?query=workflow%3A%22Build+and+publish+docker+images+to+registry%22)

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

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**

- [Creating your own course](#creating-your-own-course)
  - [Creating the GitHub Action](#creating-the-github-action)
    - [Testing the action](#testing-the-action)
    - [Adding new queries & calculating the contents for the CSV files](#adding-new-queries--calculating-the-contents-for-the-csv-files)
    - [Publishing your action](#publishing-your-action)
  - [Contributing your GitHub Action to this repository](#contributing-your-github-action-to-this-repository)
- [Example Courses](#example-courses)
- [Contributing](#contributing)
  - [Releasing new versions or updating dependencies](#releasing-new-versions-or-updating-dependencies)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Creating your own course

There are two main components to any Learning Lab course for CodeQL that uses
the components in this repository:

* [**Query Checking Action:**](#creating-the-query-checking-action)

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

* [**Learning Lab Course:**](#creating-the-learning-lab-course)

  This is the course itself.
  It creates the initial repository the participant will use for their course,
  posts instructions as GitHub issues,
  and listens for comments posted by the GitHub action to know when the user
  has completed the current task correctly,
  and is ready to advance to the next one.

### Creating the Query Checking Action

*(for an example of a working action,
see [`courses/cpp/ctf-segv`](courses/cpp/ctf-segv)).*

Course actions consist of an `action.yml` file,
and docker image built from the base image
[`codeql-learninglab-check`](codeql-learninglab-check).

The base image expects course images built on-top of it
to add the file `/home/codeql/config/config.json`,
which details the configuration for the course.

The file should look something like this:

```json
{
  "databasePath": "<path-to-database-directory>",
  "locationPaths": "https://github.com/<owner>/<repo>/blob/<sha>{path}#L{line-start}-L{line-end}",
  "expectedResults": {
    "step-01.ql": "step-01.csv",
    "step-02.ql": "step-02.csv",
    "step-03.ql": false,
  }
}
```

In addition to the `config.json` file above,
a course image needs to also add the snapshot directory
that queries should be run against,
and csv files for the expected results.

* `databasePath` should be a directory in the docker image,
  relative to the `config.json` file,
  that contains the extracted CodeQL database that queries will be run against.
  If you are using the template below,
  it will usually be the name of the only top-level directory
  from inside the database zip file.
* `locationPaths` is an optional template string that can be used to enable
  source links in comments, when participants have written queries that output
  unexpected rows, or are missing results.
  `<owner>`, `<repo>` and `<sha>` should be replace as appropriate,
  the placeholders `{path}`, `{line-start}` and `{line-end}` are used by the
  checker, and should be left as-is.
* `expectedResults` is an object that maps expected query filenames to a csv
  file detailing what the expected results for this query should be.
  Only the first expression for each row in the query results is checked.
  If instead of a CSV filename, `false` is used,
  then the checker will assume that the CSV file has simply
  never been generated,
  and will print out the resulting output from the query for you to copy into a
  new file.


To simplify course creation,
we recommend structuring your course folder like so:

```
├── answers               <─── Model Answers
│   ├── qlpack.yml
│   ├── step-01.ql        <─┬─ Answers with expected paths
│   ├── step-02.ql        <─┤  (relative to answers/)
│   └── ...               <─┘  as specified in config.json
├── image
│   ├── config
│   │   ├── config.json   <─── Main course configuration
│   │   ├── step-01.csv
│   │   ├── step-02.csv
│   │   └── ...
│   └── Dockerfile
└── action.yml
```

*(For your convinience,
we've created a template course that uses this file-structure
in the folder [`templates/action`](templates/action).
You can simply copy the folder,
and follow the instructions in the template README for what things to replace).*

`action.yml` should look something like this:

```yml
name: 'Check queries'
description: 'Check that the queries that have been pushed (as part of the lesson) produce the correct results'
author: 'GitHub <opensource+codeql-learninglab-actions@github.com>'
runs:
  using: 'docker'
  image: 'docker://docker.pkg.github.com/<owner>/<repo>/<package>'
branding:
  icon: 'check-circle'
  color: 'purple'
```

and `Dockerfile` should look something like:

```Dockerfile
FROM docker.pkg.github.com/github/codeql-learninglab-actions/codeql-learninglab-check:<version>

## Add course config
COPY --chown=codeql:codeql config /home/codeql/config
WORKDIR /home/codeql/config
# Download, unzip and then delete the zip file in one step to reduce image size
RUN wget --quiet <url-for-snapshot-zip> -O database.zip && unzip -qq database.zip && rm -rf database.zip
```

Note that we download, unzip and then delete the zip file of the snapshot
in a single step here.
This helps us reduce the size of the image,
as separate steps would result in intermediate image layers that are built
on-top of one another.

#### Testing the action

You can test the action either locally or on GitHub actions.

**Locally:**

To test a course locally,
from the course directory,
run either of these scripts:

* [`scripts/test-course-actual.sh`](scripts/test-course-only.sh):
  which will download and use the specific version of `codeql-learninglab-check`
  that is specified in `Dockerfile`
* [`scripts/test-course.sh`](scripts/test-course.sh):
  Which will also build the `codeql-learninglab-check` image locally,
  and tag it with the expected base image of the course,
  allowing you to test how changes to the `codeql-learninglab-check`
  affect this specific course,
  without publishing any new images.

**In GitHub Actions:**

If adding a course to this repository,
extend the workflow file [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
to include your new course.
Any subsequent pushes to any branch should trigger an Action to run
that will succeed only when all the expected queries produce the right results.

If you are creating a course in another repository,
you can copy the [`scripts/test-course-only.sh`](scripts/test-course-only.sh)
and [`scripts/test-course.sh`](scripts/test-course.sh) files
into that repository,
and add a similar workflow file to the one mentioned above.

#### Adding new queries & calculating the contents for the CSV files

When testing the action ([as detailed above](#testing-the-action)),
when a query that is run produces unexpected results,
or it is specified as `false` in `config.yml` instead of listing a CSV filename,
the actual results that it produces are printed out in the console.
You can then store this output as the relevant CSV file.

So the workflow for adding a new query and CSV file looks like:

* add the query (`.ql` file) to `answers/`.
* add the query to the `expectedResults` property in `config.json`,
  with a starting value of `false`.
* Test the action (whichever method you prefer).
* Copy the CSV output to the appropriate file in `image/config/`.
* Re-test the action to ensure it marks the query
  as producing the correct results.

#### Publishing your action

The main thing you need to do here is publish your Docker image somewhere,
and ensure that `action.yml` referrs to a tag that is downloadable.

We recommend setting up a GitHub Actions Workflow
to automatically publish your docker image
with the version `latest` to `docker.pkg.github.com`
whenever you get a new push to `master`.
This is what we do in
[`.github/workflows/publish.yml`](.github/workflows/publish.yml).

Any courses that are added to this repository
need to be published in this manner.

### Contributing your GitHub Action to this repository

If you want to add a course to this repository,
ensure that:

* You're creating the course in the `courses/` folder,
  under the appropriate language sub-folder for the project.
* You update both [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and
  [`.github/workflows/publish.yml`](.github/workflows/publish.yml) to include
  testing and image publishing for your course.

### Creating the Learning Lab Course

If you have not created a Learning Lab course before,
it is recommended to take the
[course on creating a course](https://lab.github.com/githubtraining/write-a-learning-lab-course)!

There are core repositories that need to be created as part of any learning-lab
course:

* **The course repository:**
  All the course configuration, instructions etc...
* **The template repository:**
  The initial contents that populate the repository
  created on behalf of the course participant.
  (All courses are taken with respect to it's own repository)

We've created two template directories
that you can use as a starting point for your own CodeQL Learning Lab Course:

* [`templates/learninglab/course`](templates/learninglab/course)
* [`templates/learninglab/course-template`](templates/learninglab/course-template)

Simply copy the contents of these templates into their own repositories,
and follow the [template instructions](templates/learninglab) to get started.

*(Remember that you need to create 2 separate repositories
for your Learning Lab course,
they can't be directories in an existing repo).*

## Example Courses

* [GitHub Security Lab CTF 1: SEGV hunt](courses/cpp/ctf-segv)

Feel free to add your own courses to this list!
See [CONTRIBUTING.md](CONTRIBUTING.md).

## Contributing

We welcome contributions,
both for new courses,
and improvements to existing courses ot the
[`codeql-learninglab-check`](codeql-learninglab-check) docker image.

### Releasing new versions or updating dependencies

See: [Updating and Releasing](CONTRIBUTING.md#updating-and-releasing)

## License

The code in this repository is licensed under MIT (see [LICENSE.md](LICENSE.md)).
However as it makes use of the CodeQL CLI,
you must also abide by the
[GitHub CodeQL Terms and Conditions](https://securitylab.github.com/tools/codeql/license),
whenever your usage involves the CodeQL CLI.

In particular,
you are not permitted to use these docker images or actions
to create CodeQL databases using the CLI in CI/CD,
as per the [terms & conditions](https://securitylab.github.com/tools/codeql/license):

> **the Software cannot be used** [...]
> **To generate CodeQL databases for or during automated analysis,
> continuous integration or continuous delivery,
> whether as part of normal software engineering processes or otherwise.**

