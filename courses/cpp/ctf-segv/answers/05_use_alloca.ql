/**
 * @name 20_use_alloca
 * @description Find all calls to __libc_use_alloca
 * @kind problem
 * @problem.severity warning
 */

import cpp
import semmle.code.cpp.rangeanalysis.SimpleRangeAnalysis

from FunctionCall call
where call.getTarget().getName() = "__libc_use_alloca"
select call, "call to __libc_use_alloca"
