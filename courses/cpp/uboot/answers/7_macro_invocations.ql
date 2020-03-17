/**
 * @kind problem
 */

import cpp

from Macro m, MacroInvocation mi
where mi.getMacro() = m and m.getName().regexpMatch("ntoh(s|ll?)")
select mi, "Invoking a macro reading from the network"
