

(function() {
  'use strict';

  angular
    .module('iui.calendar', ['ui.calendar'])
    .config(config);

  function config(uiCalendarConfig) {
    uiCalendarConfig.editable = true;
    uiCalendarConfig.eventLimit = true;
    uiCalendarConfig.defaultView = 'month';
    uiCalendarConfig.views = {
      today: {
        // options apply to basicWeek and basicDay views
        buttonText: 'Today'
      },
      month: {
        buttonText: 'Month'
      },
      agendaWeek: {
        buttonText: 'Week'
          // options apply to agendaWeek and agendaDay views
      },
      agendaWorkWeek: {
        type: 'agendaWeek',
        weekends: false,
        buttonText: 'Work week'
      },
      agendaDay: {
        buttonText: 'Day'
        // options apply to agendaWeek and agendaDay views
      }
    };

    uiCalendarConfig.header = {
      left: 'prev,next title',
      center: '',
      right: 'today agendaDay,agendaWorkWeek,agendaWeek,month'
    };
  }


})();