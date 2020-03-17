/**
 * @kind problem
 */

import cpp

from Function f
where f.getName() = "memcpy"
select f, "a function named memcpy"
