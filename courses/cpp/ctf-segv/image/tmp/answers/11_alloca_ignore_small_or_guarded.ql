/**
 * @name 30_alloca_ignore_small_or_guarded
 * @description Find all calls to alloca, with small allocation sizes and calls
 *              guarded by __libc_use_alloca filtered out.
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

predicate guarded_alloca(FunctionCall alloca) {
  exists(GuardCondition guard, BasicBlock block, boolean branch |
    guard = use_alloca(branch).asExpr() and
    guard.controls(block, branch) and
    block.contains(alloca)
  )
}

from FunctionCall alloca, Expr sizeArg
where
  alloca.getTarget().getName() = "__builtin_alloca" and
  sizeArg = alloca.getArgument(0) and
  (lowerBound(sizeArg) < 0 or 65536 <= upperBound(sizeArg)) and
  not guarded_alloca(alloca)
select alloca, "call to alloca"
