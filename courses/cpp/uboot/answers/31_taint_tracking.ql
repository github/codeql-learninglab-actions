/**
* @kind path-problem
*/

import cpp
import semmle.code.cpp.dataflow.TaintTracking
import DataFlow::PathGraph
 
class NetworkRead extends Expr {
  NetworkRead() {
      exists(MacroInvocation i | this = i.getExpr()
        and i.getMacroName().regexpMatch("ntoh(l|ll|s)"))
  }
}

class Config extends TaintTracking::Configuration {
  Config() { this = "NetworkToMemFuncLength" }
 
  override predicate isSource(DataFlow::Node source) {
      source.asExpr() instanceof NetworkRead
  }
 
  override predicate isSink(DataFlow::Node sink) {
    exists (FunctionCall fc |
        sink.asExpr() = fc.getArgument(2) and fc.getTarget().getName()= "memcpy")
  }
}

from Config cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink, source, sink, "ntoh flows to memcpy"