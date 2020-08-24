import javascript

from CallExpr dollarCall, Expr dollarArg
where
    dollarArg = dollarCall.getArgument(0) and
    dollarCall.getCalleeName() = "$"
select dollarArg
