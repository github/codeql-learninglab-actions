/**
 * @name 01_alloca_definition
 * @description Find the definition of the alloca macro
 * @kind problem
 * @problem.severity warning
 */

import cpp

from Macro alloca
where alloca.getName() = "alloca"
select alloca, "alloca macro"
