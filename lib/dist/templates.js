(function(module) {
try {
  module = angular.module('iui.calendarTemplates');
} catch (e) {
  module = angular.module('iui.calendarTemplates', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('/$iui-calendar/iui-calendar/iui-calendar.html',
    '<section>\n' +
    '  {{calendar.hello}} {{calendar.name}}\n' +
    '</section>');
}]);
})();
