# CodeQL LearningLab Course Action Template

Copy this entire directory,
and replace the following:

* Replace `<owner>`, `<repo>` and `<pkg>` in the `image` property in
  [`action.yml`](action.yml) to reference the correct repository
  where the docker image will be published,
  and with a package name of your choice.
  (For courses in this repository,
  we use the convention of taking the course path,
  and replacing slashes with dashes,
  e.g. `courses/cpp/ctf-segv` becomes `courses-cpp-ctf-segv`)
* Replace the zip file URL in [`image/Dockerfile`](image/Dockerfile)
  to point to the CodeQL database that will be used in your course.

After this,
update [`answers/`](answers) and [`image/config/`](image/config)
to add your model answers and expected query results as appropriate.
