(function() {
  'use strict';

  describe('iui-calendar directive', function () {
    var scope,
      element,
      el;
    beforeEach(function () {
      module('iuiCalendar');
      module('templates');
    });
    beforeEach(inject(function ($compile, $rootScope) {
      scope = $rootScope.$new();

      scope.name = 'Bart';
      
      element = angular.element('<div><iui-calendar name="name"></iui-calendar></div>');
      el = $compile(element)(scope);
      scope.$digest();
    }));

    it('should have one `<section>`', function() {
      expect(el[0].querySelectorAll('section').length).toBe(1);
    });

    
  });
})();