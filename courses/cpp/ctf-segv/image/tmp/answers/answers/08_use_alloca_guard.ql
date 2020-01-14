/**
 * @name 23_use_alloca_guard
 * @description Find all guard conditions where the condition is a call to
 *              __libc_use_alloca.
 * @kind problem
 * @problem.severity warning
 */

import cpp
import semmle.code.cpp.rangeanalysis.SimpleRangeAnalysis
import semmle.code.cpp.controlflow.Guards
import semmle.code.cpp.dataflow.DataFlow

DataFlow::Node use_alloca() {
  result.asExpr().(FunctionCall).getTarget().getName() = "__libc_use_alloca"
  or
  result.asExpr().(FunctionCall).getTarget().getName() = "__builtin_expect" and
  result.asExpr().(FunctionCall).getArgument(0) = use_alloca().asExpr()
  or
  DataFlow::localFlow(use_alloca(), result)
}

from GuardCondition guard
where guard = use_alloca().asExpr()
select guard, "__libc_use_alloca guard"
