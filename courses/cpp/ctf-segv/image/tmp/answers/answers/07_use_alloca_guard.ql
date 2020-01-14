/**
 * @name 22_use_alloca_guard
 * @description Find all guard conditions where the condition is a call to
 *              __libc_use_alloca.
 * @kind problem
 * @problem.severity warning
 */

import cpp
import semmle.code.cpp.rangeanalysis.SimpleRangeAnalysis
import semmle.code.cpp.controlflow.Guards
import semmle.code.cpp.dataflow.DataFlow

from DataFlow::Node source, DataFlow::Node sink
where
  source.asExpr().(FunctionCall).getTarget().getName() = "__libc_use_alloca" and
  sink.asExpr() instanceof GuardCondition and
  DataFlow::localFlow(source, sink)
select sink, "__libc_use_alloca guard"
