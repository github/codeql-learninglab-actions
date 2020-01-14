/**
 * @name 00_alloca_definition
 * @description Find the definition of the alloca macro
 * @kind problem
 */

import cpp

from Function f
where f.getName() = "getchar"
select f, "a getchar function"
