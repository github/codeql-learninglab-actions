/**
 * @name 25_guarded_alloca
 * @description Find all calls to alloca that are safe because they are
 *              guarded by a call to __libc_use_alloca.
 * @kind problem
 * @problem.severity warning
 */

import cpp
import semmle.code.cpp.rangeanalysis.SimpleRangeAnalysis
import semmle.code.cpp.controlflow.Guards
import semmle.code.cpp.dataflow.DataFlow

DataFlow::Node use_alloca(boolean branch) {
  result.asExpr().(FunctionCall).getTarget().getName() = "__libc_use_alloca" and
  branch = true
  or
  result.asExpr().(FunctionCall).getTarget().getName() = "__builtin_expect" and
  result.asExpr().(FunctionCall).getArgument(0) = use_alloca(branch).asExpr()
  or
  DataFlow::localFlow(use_alloca(branch), result)
  or
  result.asExpr().(NotExpr).getOperand() = use_alloca(branch.booleanNot()).asExpr()
}

from GuardCondition guard, BasicBlock block, boolean branch, FunctionCall alloca
where
  guard = use_alloca(branch).asExpr() and
  guard.controls(block, branch) and
  alloca.getTarget().getName() = "__builtin_alloca" and
  block.contains(alloca)
select block, "safe call to __builtin_alloca"
