/**
 * @kind problem
 */

import cpp

class NetworkRead extends Expr {
  NetworkRead() {
    exists (MacroInvocation mi | mi.getMacro().getName().regexpMatch("ntoh(s|ll?)") and this = mi.getExpr())
  }
}
 
from NetworkRead n
select n, "Reading from the network"
