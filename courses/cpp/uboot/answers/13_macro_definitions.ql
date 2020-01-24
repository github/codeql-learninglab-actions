/**
 * @kind problem
 */

import cpp

from Macro m
where m.getName().regexpMatch("ntoh(s|ll?)")
select m, "a macro reading from the network"

