/**
 * @name 40_fopen
 * @description Find all calls to fopen
 * @kind problem
 * @problem.severity warning
 */

import cpp

from FunctionCall call
where call.getTarget().getName().matches("%fopen")
select call, "call to fopen"
