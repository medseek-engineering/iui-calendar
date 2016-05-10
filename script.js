angular
  .module('calendarDemoApp', ['iui.calendar'])
  .factory('calendarService', calendarService)
  .controller('CalendarCtrl', CalendarCtrl);



function calendarService(uiCalendarConfig) {

  var date = new Date();
  var d = date.getDate();
  var m = date.getMonth();
  var y = date.getFullYear();


  var eventData = [
    [
      {
        title: 'All Day Event',
        className: [],
        start: new Date(y, m, d)
      },
      {
        title: 'Long Event',
        className: [],
        start: new Date(y, m, d - 5),
        end: new Date(y, m, d - 2)
      },
      {
        id: 999,
        title: 'Repeating Event',
        className: [],
        start: new Date(y, m, d - 3, 16, 0),
        allDay: false
      },
      {
        id: 999,
        title: 'Repeating Event',
        className: [],
        start: new Date(y, m, d + 4, 16, 0),
        allDay: false
      },
      {
        title: 'Birthday Party',
        className: [],
        start: new Date(y, m, d + 1, 19, 0),
        end: new Date(y, m, d + 1, 22, 30),
        allDay: false
      },
      {
        title: 'Click for Google',
        className: [],
        start: new Date(y, m, 28),
        end: new Date(y, m, 29)
      }
    ]
  ];


  // callbacks and settings defined below are defined in http://fullcalendar.io/docs/
  var factory = {
    eventData: eventData,
    settings: {
      dayClick: dayClick,
      eventClick: eventClick,
      eventDrop: eventDrop,
      eventResize: eventResize,
      viewRender: viewRender
    }
  };

  return factory;

  function dayClick(date, jsEvent, view) {
    // Triggered when the user clicks on a day.
    console.log(date, jsEvent, view);
  }

  function eventClick(event, jsEvent, view) {
    // Triggered when the user clicks an event.
    console.log(event, jsEvent, view);
  }

  function eventDrop(event, delta, revertFunc, jsEvent, ui, view) {
    // Triggered when dragging stops and the event has moved to a different day/time.
    console.log(event, delta, revertFunc, jsEvent, ui, view);
  }

  function eventResize(event, delta, revertFunc, jsEvent, ui, view) {
    // Triggered when resizing stops and the event has changed in duration.
    console.log(event, delta);
  }

  function viewRender(view, element) {
    // Triggered when a new date-range is rendered, or when the view type switches.
    console.log(view, element);
  }
 

}

CalendarCtrl.$inject = ['calendarService'];

function CalendarCtrl(calendarService) {
    var vm = this;
    vm.calendarService = calendarService;
}
/* EOF */