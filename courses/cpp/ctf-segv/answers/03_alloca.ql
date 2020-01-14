/**
 * @name 10_alloca
 * @description Find all calls to alloca
 * @kind problem
 * @problem.severity warning
 */

import cpp

from FunctionCall alloca
where alloca.getTarget().getName() = "__builtin_alloca"
select alloca, "call to alloca"
