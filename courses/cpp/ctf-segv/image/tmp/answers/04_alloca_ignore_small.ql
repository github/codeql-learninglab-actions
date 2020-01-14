/**
 * @name 11_alloca_ignore_small
 * @description Find all calls to alloca, with small allocation sizes filtered out.
 * @kind problem
 * @problem.severity warning
 */

import cpp
import semmle.code.cpp.rangeanalysis.SimpleRangeAnalysis

from FunctionCall alloca, Expr sizeArg
where
  alloca.getTarget().getName() = "__builtin_alloca" and
  sizeArg = alloca.getArgument(0) and
  (lowerBound(sizeArg) < 0 or 65536 <= upperBound(sizeArg))
select alloca, "call to alloca"
