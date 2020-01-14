/**
 * @name 41_fopen_to_alloca_taint
 * @description Track taint from fopen to alloca.
 * @kind path-problem
 * @problem.severity warning
 */

import cpp
import semmle.code.cpp.rangeanalysis.SimpleRangeAnalysis
import semmle.code.cpp.dataflow.TaintTracking
import semmle.code.cpp.models.interfaces.DataFlow
import semmle.code.cpp.controlflow.Guards
import DataFlow::PathGraph

// Track taint through `__strnlen`.
class StrlenFunction extends DataFlowFunction {
  StrlenFunction() { this.getName().matches("%str%len%") }

  override predicate hasDataFlow(FunctionInput i, FunctionOutput o) {
    i.isInParameter(0) and o.isOutReturnValue()
  }
}

// Track taint through `__getdelim`.
class GetDelimFunction extends DataFlowFunction {
  GetDelimFunction() { this.getName().matches("%get%delim%") }

  override predicate hasDataFlow(FunctionInput i, FunctionOutput o) {
    i.isInParameter(3) and o.isOutParameterPointer(0)
  }
}

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

class Config extends TaintTracking::Configuration {
  Config() { this = "fopen_to_alloca_taint" }

  override predicate isSource(DataFlow::Node source) {
    source.asExpr().(FunctionCall).getTarget().getName().regexpMatch(".*fopen")
  }

  override predicate isSink(DataFlow::Node sink) {
    exists(FunctionCall alloca, Expr sizeArg |
      alloca.getTarget().getName() = "__builtin_alloca" and
      sizeArg = alloca.getArgument(0) and
      (lowerBound(sizeArg) < 0 or 65536 <= upperBound(sizeArg)) and
      not guarded_alloca(alloca) and
      sink.asExpr() = sizeArg
    )
  }
}

from Config cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink, source, sink, "fopen flows to alloca"
