import javascript

from DataFlow::FunctionNode plugin, DataFlow::ParameterNode optionsParam
where
  plugin = jquery().getAPropertyRead("fn").getAPropertySource() and
  optionsParam = plugin.getLastParameter()
select plugin, optionsParam
