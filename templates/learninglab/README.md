# CodeQL Learning Lab Course Templates

If you have not created a Learning Lab course before,
it is recommended to take the
[course on creating a course](https://lab.github.com/githubtraining/write-a-learning-lab-course)!

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Usage instructions:

1. Create a repo called `<MY-COURSE-REPO>`,
   and add the contents of the directory [`course`](course)
   as the initial contents for that repo.
1. Create a repo called `<MY-COURSE-REPO>-template`,
   under the same owner as `<MY-COURSE-REPO>`,
   and add the contents of the directory [`course-template`](course-template)
   as the initial contents for that repo.
1. In `<MY-COURSE-REPO>`:
   1. Update the value of `META` in `generate-config.js`,
      and regenerate the `config.yml` by running:
      ```
      node generate-config.js > config.yml
      ```
   1. Flesh out the details of the course in `course-details.md`
   1. Add instructions for each of the steps of the course as individual
      markdown files in `responses/`
   1. Update the value of `STEPS` in `generate-config.js`
      to add details of each of the steps that course participants need to do,
      and regenerate the `config.yml` by running:
      ```
      node generate-config.js  > config.yml
      ```
    1. Commit your changes and push to the repository
1. In `<MY-COURSE-REPO>-template`:
    1. Update `.qlpack` with an appropriate pack name,
       for example rename it `qlpack.yml`,
       and the language of the database that queries will be run against.
    2. Create a `README.md` with e.g. some initial instructions for the user to
       go to their Issues tab to get more instructions.
    3. Update `.github.to.move/workflows/action/Dockerfile` to reference the
       tag of the dockerfile from your [Query Checking Action:](../../README.md#creating-the-query-checking-action)
2. Add your course to https://lab.github.com

## Current limitations & workarounds

* GitHub Packages can't directly be used by an actions.yml file,
  see: https://github.com/github/codeql-learninglab-actions/issues/14

* Learning Lab can't currently create courses with Actions workflows,
  see: https://github.com/github/codeql-learninglab-actions/issues/15

  In the meantime,
  make sure your course includes instructions on how users should rename
  `.github.to.move` to `.github` before writing queries.