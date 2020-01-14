/**
 * @name 21_use_alloca_guard
 * @description Find all guard conditions where the condition is a call to
 *              __libc_use_alloca.
 * @kind problem
 * @problem.severity warning
 */

import cpp
import semmle.code.cpp.rangeanalysis.SimpleRangeAnalysis
import semmle.code.cpp.controlflow.Guards

from GuardCondition guard
where guard.(FunctionCall).getTarget().getName() = "__libc_use_alloca"
select guard, "__libc_use_alloca guard"
