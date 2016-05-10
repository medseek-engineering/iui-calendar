(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

// angular-ui-calendar
var angularUICalendar = require('angular-ui-calendar');

(function () {
  'use strict';

  angular.module('iui.calendar', ['ui.calendar']).config(config);

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
},{"angular-ui-calendar":2}],2:[function(require,module,exports){
/*
*  AngularJs Fullcalendar Wrapper for the JQuery FullCalendar
*  API @ http://arshaw.com/fullcalendar/
*
*  Angular Calendar Directive that takes in the [eventSources] nested array object as the ng-model and watches it deeply changes.
*       Can also take in multiple event urls as a source object(s) and feed the events per view.
*       The calendar will watch any eventSource array and update itself when a change is made.
*
*/

angular.module('ui.calendar', [])
  .constant('uiCalendarConfig', {calendars: {}})
  .controller('uiCalendarCtrl', ['$scope', 
                                 '$timeout', 
                                 '$locale', function(
                                  $scope, 
                                  $timeout, 
                                  $locale){

      var sources = $scope.eventSources,
          extraEventSignature = $scope.calendarWatchEvent ? $scope.calendarWatchEvent : angular.noop,

          wrapFunctionWithScopeApply = function(functionToWrap){
              var wrapper;

              if (functionToWrap){
                  wrapper = function(){
                      // This happens outside of angular context so we need to wrap it in a timeout which has an implied apply.
                      // In this way the function will be safely executed on the next digest.

                      var args = arguments;
                      var _this = this;
                      $timeout(function(){
                        functionToWrap.apply(_this, args);
                      });
                  };
              }

              return wrapper;
          };

      var eventSerialId = 1;
      // @return {String} fingerprint of the event object and its properties
      this.eventFingerprint = function(e) {
        if (!e._id) {
          e._id = eventSerialId++;
        }
        // This extracts all the information we need from the event. http://jsperf.com/angular-calendar-events-fingerprint/3
        return "" + e._id + (e.id || '') + (e.title || '') + (e.url || '') + (+e.start || '') + (+e.end || '') +
          (e.allDay || '') + (e.className || '') + extraEventSignature(e) || '';
      };

      var sourceSerialId = 1, sourceEventsSerialId = 1;
      // @return {String} fingerprint of the source object and its events array
      this.sourceFingerprint = function(source) {
          var fp = '' + (source.__id || (source.__id = sourceSerialId++)),
              events = angular.isObject(source) && source.events;
          if (events) {
              fp = fp + '-' + (events.__id || (events.__id = sourceEventsSerialId++));
          }
          return fp;
      };

      // @return {Array} all events from all sources
      this.allEvents = function() {
        // do sources.map(&:events).flatten(), but we don't have flatten
        var arraySources = [];
        for (var i = 0, srcLen = sources.length; i < srcLen; i++) {
          var source = sources[i];
          if (angular.isArray(source)) {
            // event source as array
            arraySources.push(source);
          } else if(angular.isObject(source) && angular.isArray(source.events)){
            // event source as object, ie extended form
            var extEvent = {};
            for(var key in source){
              if(key !== '_id' && key !== 'events'){
                 extEvent[key] = source[key];
              }
            }
            for(var eI = 0;eI < source.events.length;eI++){
              angular.extend(source.events[eI],extEvent);
            }
            arraySources.push(source.events);
          }
        }
        return Array.prototype.concat.apply([], arraySources);
      };

      // Track changes in array of objects by assigning id tokens to each element and watching the scope for changes in the tokens
      // @param {Array|Function} arraySource array of objects to watch
      // @param tokenFn {Function} that returns the token for a given object
      // @return {Object}
      //  subscribe: function(scope, function(newTokens, oldTokens))
      //    called when source has changed. return false to prevent individual callbacks from firing
      //  onAdded/Removed/Changed:
      //    when set to a callback, called each item where a respective change is detected
      this.changeWatcher = function(arraySource, tokenFn) {
        var self;
        var getTokens = function() {
          var array = angular.isFunction(arraySource) ? arraySource() : arraySource;
          var result = [], token, el;
          for (var i = 0, n = array.length; i < n; i++) {
            el = array[i];
            token = tokenFn(el);
            map[token] = el;
            result.push(token);
          }
          return result;
        };

        // @param {Array} a
        // @param {Array} b
        // @return {Array} elements in that are in a but not in b
        // @example
        //  subtractAsSets([6, 100, 4, 5], [4, 5, 7]) // [6, 100]
        var subtractAsSets = function(a, b) {
          var result = [], inB = {}, i, n;
          for (i = 0, n = b.length; i < n; i++) {
            inB[b[i]] = true;
          }
          for (i = 0, n = a.length; i < n; i++) {
            if (!inB[a[i]]) {
              result.push(a[i]);
            }
          }
          return result;
        };

        // Map objects to tokens and vice-versa
        var map = {};

        // Compare newTokens to oldTokens and call onAdded, onRemoved, and onChanged handlers for each affected event respectively.
        var applyChanges = function(newTokens, oldTokens) {
          var i, n, el, token;
          var replacedTokens = {};
          var removedTokens = subtractAsSets(oldTokens, newTokens);
          for (i = 0, n = removedTokens.length; i < n; i++) {
            var removedToken = removedTokens[i];
            el = map[removedToken];
            delete map[removedToken];
            var newToken = tokenFn(el);
            // if the element wasn't removed but simply got a new token, its old token will be different from the current one
            if (newToken === removedToken) {
              self.onRemoved(el);
            } else {
              replacedTokens[newToken] = removedToken;
              self.onChanged(el);
            }
          }

          var addedTokens = subtractAsSets(newTokens, oldTokens);
          for (i = 0, n = addedTokens.length; i < n; i++) {
            token = addedTokens[i];
            el = map[token];
            if (!replacedTokens[token]) {
              self.onAdded(el);
            }
          }
        };
        return self = {
          subscribe: function(scope, onArrayChanged) {
            scope.$watch(getTokens, function(newTokens, oldTokens) {
              var notify = !(onArrayChanged && onArrayChanged(newTokens, oldTokens) === false);
              if (notify) {
                applyChanges(newTokens, oldTokens);
              }
            }, true);
          },
          onAdded: angular.noop,
          onChanged: angular.noop,
          onRemoved: angular.noop
        };
      };

      this.getFullCalendarConfig = function(calendarSettings, uiCalendarConfig){
          var config = {};

          angular.extend(config, uiCalendarConfig);
          angular.extend(config, calendarSettings);

          angular.forEach(config, function(value,key){
            if (typeof value === 'function'){
              config[key] = wrapFunctionWithScopeApply(config[key]);
            }
          });

          return config;
      };

    this.getLocaleConfig = function(fullCalendarConfig) {
      if (!fullCalendarConfig.lang || fullCalendarConfig.useNgLocale) {
        // Configure to use locale names by default
        var tValues = function(data) {
          // convert {0: "Jan", 1: "Feb", ...} to ["Jan", "Feb", ...]
          var r, k;
          r = [];
          for (k in data) {
            r[k] = data[k];
          }
          return r;
        };
        var dtf = $locale.DATETIME_FORMATS;
        return {
          monthNames: tValues(dtf.MONTH),
          monthNamesShort: tValues(dtf.SHORTMONTH),
          dayNames: tValues(dtf.DAY),
          dayNamesShort: tValues(dtf.SHORTDAY)
        };
      }
      return {};
    };
  }])
  .directive('uiCalendar', ['uiCalendarConfig', function(uiCalendarConfig) {
    return {
      restrict: 'A',
      scope: {eventSources:'=ngModel',calendarWatchEvent: '&'},
      controller: 'uiCalendarCtrl',
      link: function(scope, elm, attrs, controller) {

        var sources = scope.eventSources,
            sourcesChanged = false,
            calendar,
            eventSourcesWatcher = controller.changeWatcher(sources, controller.sourceFingerprint),
            eventsWatcher = controller.changeWatcher(controller.allEvents, controller.eventFingerprint),
            options = null;

        function getOptions(){
          var calendarSettings = attrs.uiCalendar ? scope.$parent.$eval(attrs.uiCalendar) : {},
              fullCalendarConfig;

          fullCalendarConfig = controller.getFullCalendarConfig(calendarSettings, uiCalendarConfig);

          var localeFullCalendarConfig = controller.getLocaleConfig(fullCalendarConfig);
          angular.extend(localeFullCalendarConfig, fullCalendarConfig);
          options = { eventSources: sources };
          angular.extend(options, localeFullCalendarConfig);
          //remove calendars from options
          options.calendars = null;

          var options2 = {};
          for(var o in options){
            if(o !== 'eventSources'){
              options2[o] = options[o];
            }
          }
          return JSON.stringify(options2);
        }

        scope.destroy = function(){
          if(calendar && calendar.fullCalendar){
            calendar.fullCalendar('destroy');
          }
          if(attrs.calendar) {
            calendar = uiCalendarConfig.calendars[attrs.calendar] = $(elm).html('');
          } else {
            calendar = $(elm).html('');
          }
        };

        scope.init = function(){
          calendar.fullCalendar(options);
          if(attrs.calendar) {
            uiCalendarConfig.calendars[attrs.calendar] = calendar;
          }          
        };

        eventSourcesWatcher.onAdded = function(source) {
          calendar.fullCalendar('addEventSource', source);
          sourcesChanged = true;
        };

        eventSourcesWatcher.onRemoved = function(source) {
          calendar.fullCalendar('removeEventSource', source);
          sourcesChanged = true;
        };

        eventSourcesWatcher.onChanged = function(source) {
          calendar.fullCalendar('refetchEvents');
          sourcesChanged = true;
        };

        eventsWatcher.onAdded = function(event) {
          calendar.fullCalendar('renderEvent', event, (event.stick ? true : false));
        };

        eventsWatcher.onRemoved = function(event) {
          calendar.fullCalendar('removeEvents', event._id);
        };

        eventsWatcher.onChanged = function(event) {
          event._start = jQuery.fullCalendar.moment(event.start);
          event._end = jQuery.fullCalendar.moment(event.end);
          calendar.fullCalendar('updateEvent', event);
        };

        eventSourcesWatcher.subscribe(scope);
        eventsWatcher.subscribe(scope, function() {
          if (sourcesChanged === true) {
            sourcesChanged = false;
            // return false to prevent onAdded/Removed/Changed handlers from firing in this case
            return false;
          }
        });

        scope.$watch(getOptions, function(newO,oldO){
            scope.destroy();
            scope.init();
        });
      }
    };
}]);

},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb3JnYW4uU3RvbmUvRG9jdW1lbnRzL2l1aS1jYWxlbmRhci9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9yZ2FuLlN0b25lL0RvY3VtZW50cy9pdWktY2FsZW5kYXIvYXBwL2Zha2VfMTk5MjIzZmYuanMiLCIvVXNlcnMvTW9yZ2FuLlN0b25lL0RvY3VtZW50cy9pdWktY2FsZW5kYXIvbm9kZV9tb2R1bGVzL2FuZ3VsYXItdWktY2FsZW5kYXIvc3JjL2NhbGVuZGFyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vLyBhbmd1bGFyLXVpLWNhbGVuZGFyXG52YXIgYW5ndWxhclVJQ2FsZW5kYXIgPSByZXF1aXJlKCdhbmd1bGFyLXVpLWNhbGVuZGFyJyk7XG5cbihmdW5jdGlvbiAoKSB7XG4gICd1c2Ugc3RyaWN0JztcblxuICBhbmd1bGFyLm1vZHVsZSgnaXVpLmNhbGVuZGFyJywgWyd1aS5jYWxlbmRhciddKS5jb25maWcoY29uZmlnKTtcblxuICBmdW5jdGlvbiBjb25maWcodWlDYWxlbmRhckNvbmZpZykge1xuICAgIHVpQ2FsZW5kYXJDb25maWcuZWRpdGFibGUgPSB0cnVlO1xuICAgIHVpQ2FsZW5kYXJDb25maWcuZXZlbnRMaW1pdCA9IHRydWU7XG4gICAgdWlDYWxlbmRhckNvbmZpZy5kZWZhdWx0VmlldyA9ICdtb250aCc7XG4gICAgdWlDYWxlbmRhckNvbmZpZy52aWV3cyA9IHtcbiAgICAgIHRvZGF5OiB7XG4gICAgICAgIC8vIG9wdGlvbnMgYXBwbHkgdG8gYmFzaWNXZWVrIGFuZCBiYXNpY0RheSB2aWV3c1xuICAgICAgICBidXR0b25UZXh0OiAnVG9kYXknXG4gICAgICB9LFxuICAgICAgbW9udGg6IHtcbiAgICAgICAgYnV0dG9uVGV4dDogJ01vbnRoJ1xuICAgICAgfSxcbiAgICAgIGFnZW5kYVdlZWs6IHtcbiAgICAgICAgYnV0dG9uVGV4dDogJ1dlZWsnXG4gICAgICAgIC8vIG9wdGlvbnMgYXBwbHkgdG8gYWdlbmRhV2VlayBhbmQgYWdlbmRhRGF5IHZpZXdzXG4gICAgICB9LFxuICAgICAgYWdlbmRhV29ya1dlZWs6IHtcbiAgICAgICAgdHlwZTogJ2FnZW5kYVdlZWsnLFxuICAgICAgICB3ZWVrZW5kczogZmFsc2UsXG4gICAgICAgIGJ1dHRvblRleHQ6ICdXb3JrIHdlZWsnXG4gICAgICB9LFxuICAgICAgYWdlbmRhRGF5OiB7XG4gICAgICAgIGJ1dHRvblRleHQ6ICdEYXknXG4gICAgICAgIC8vIG9wdGlvbnMgYXBwbHkgdG8gYWdlbmRhV2VlayBhbmQgYWdlbmRhRGF5IHZpZXdzXG4gICAgICB9XG4gICAgfTtcblxuICAgIHVpQ2FsZW5kYXJDb25maWcuaGVhZGVyID0ge1xuICAgICAgbGVmdDogJ3ByZXYsbmV4dCB0aXRsZScsXG4gICAgICBjZW50ZXI6ICcnLFxuICAgICAgcmlnaHQ6ICd0b2RheSBhZ2VuZGFEYXksYWdlbmRhV29ya1dlZWssYWdlbmRhV2Vlayxtb250aCdcbiAgICB9O1xuICB9XG59KSgpOyIsIi8qXHJcbiogIEFuZ3VsYXJKcyBGdWxsY2FsZW5kYXIgV3JhcHBlciBmb3IgdGhlIEpRdWVyeSBGdWxsQ2FsZW5kYXJcclxuKiAgQVBJIEAgaHR0cDovL2Fyc2hhdy5jb20vZnVsbGNhbGVuZGFyL1xyXG4qXHJcbiogIEFuZ3VsYXIgQ2FsZW5kYXIgRGlyZWN0aXZlIHRoYXQgdGFrZXMgaW4gdGhlIFtldmVudFNvdXJjZXNdIG5lc3RlZCBhcnJheSBvYmplY3QgYXMgdGhlIG5nLW1vZGVsIGFuZCB3YXRjaGVzIGl0IGRlZXBseSBjaGFuZ2VzLlxyXG4qICAgICAgIENhbiBhbHNvIHRha2UgaW4gbXVsdGlwbGUgZXZlbnQgdXJscyBhcyBhIHNvdXJjZSBvYmplY3QocykgYW5kIGZlZWQgdGhlIGV2ZW50cyBwZXIgdmlldy5cclxuKiAgICAgICBUaGUgY2FsZW5kYXIgd2lsbCB3YXRjaCBhbnkgZXZlbnRTb3VyY2UgYXJyYXkgYW5kIHVwZGF0ZSBpdHNlbGYgd2hlbiBhIGNoYW5nZSBpcyBtYWRlLlxyXG4qXHJcbiovXHJcblxyXG5hbmd1bGFyLm1vZHVsZSgndWkuY2FsZW5kYXInLCBbXSlcclxuICAuY29uc3RhbnQoJ3VpQ2FsZW5kYXJDb25maWcnLCB7Y2FsZW5kYXJzOiB7fX0pXHJcbiAgLmNvbnRyb2xsZXIoJ3VpQ2FsZW5kYXJDdHJsJywgWyckc2NvcGUnLCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJyR0aW1lb3V0JywgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICckbG9jYWxlJywgZnVuY3Rpb24oXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAkc2NvcGUsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJHRpbWVvdXQsIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvY2FsZSl7XHJcblxyXG4gICAgICB2YXIgc291cmNlcyA9ICRzY29wZS5ldmVudFNvdXJjZXMsXHJcbiAgICAgICAgICBleHRyYUV2ZW50U2lnbmF0dXJlID0gJHNjb3BlLmNhbGVuZGFyV2F0Y2hFdmVudCA/ICRzY29wZS5jYWxlbmRhcldhdGNoRXZlbnQgOiBhbmd1bGFyLm5vb3AsXHJcblxyXG4gICAgICAgICAgd3JhcEZ1bmN0aW9uV2l0aFNjb3BlQXBwbHkgPSBmdW5jdGlvbihmdW5jdGlvblRvV3JhcCl7XHJcbiAgICAgICAgICAgICAgdmFyIHdyYXBwZXI7XHJcblxyXG4gICAgICAgICAgICAgIGlmIChmdW5jdGlvblRvV3JhcCl7XHJcbiAgICAgICAgICAgICAgICAgIHdyYXBwZXIgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgICAgICAgICAgICAgLy8gVGhpcyBoYXBwZW5zIG91dHNpZGUgb2YgYW5ndWxhciBjb250ZXh0IHNvIHdlIG5lZWQgdG8gd3JhcCBpdCBpbiBhIHRpbWVvdXQgd2hpY2ggaGFzIGFuIGltcGxpZWQgYXBwbHkuXHJcbiAgICAgICAgICAgICAgICAgICAgICAvLyBJbiB0aGlzIHdheSB0aGUgZnVuY3Rpb24gd2lsbCBiZSBzYWZlbHkgZXhlY3V0ZWQgb24gdGhlIG5leHQgZGlnZXN0LlxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uKCl7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uVG9XcmFwLmFwcGx5KF90aGlzLCBhcmdzKTtcclxuICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgcmV0dXJuIHdyYXBwZXI7XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgdmFyIGV2ZW50U2VyaWFsSWQgPSAxO1xyXG4gICAgICAvLyBAcmV0dXJuIHtTdHJpbmd9IGZpbmdlcnByaW50IG9mIHRoZSBldmVudCBvYmplY3QgYW5kIGl0cyBwcm9wZXJ0aWVzXHJcbiAgICAgIHRoaXMuZXZlbnRGaW5nZXJwcmludCA9IGZ1bmN0aW9uKGUpIHtcclxuICAgICAgICBpZiAoIWUuX2lkKSB7XHJcbiAgICAgICAgICBlLl9pZCA9IGV2ZW50U2VyaWFsSWQrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gVGhpcyBleHRyYWN0cyBhbGwgdGhlIGluZm9ybWF0aW9uIHdlIG5lZWQgZnJvbSB0aGUgZXZlbnQuIGh0dHA6Ly9qc3BlcmYuY29tL2FuZ3VsYXItY2FsZW5kYXItZXZlbnRzLWZpbmdlcnByaW50LzNcclxuICAgICAgICByZXR1cm4gXCJcIiArIGUuX2lkICsgKGUuaWQgfHwgJycpICsgKGUudGl0bGUgfHwgJycpICsgKGUudXJsIHx8ICcnKSArICgrZS5zdGFydCB8fCAnJykgKyAoK2UuZW5kIHx8ICcnKSArXHJcbiAgICAgICAgICAoZS5hbGxEYXkgfHwgJycpICsgKGUuY2xhc3NOYW1lIHx8ICcnKSArIGV4dHJhRXZlbnRTaWduYXR1cmUoZSkgfHwgJyc7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgc291cmNlU2VyaWFsSWQgPSAxLCBzb3VyY2VFdmVudHNTZXJpYWxJZCA9IDE7XHJcbiAgICAgIC8vIEByZXR1cm4ge1N0cmluZ30gZmluZ2VycHJpbnQgb2YgdGhlIHNvdXJjZSBvYmplY3QgYW5kIGl0cyBldmVudHMgYXJyYXlcclxuICAgICAgdGhpcy5zb3VyY2VGaW5nZXJwcmludCA9IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgICAgdmFyIGZwID0gJycgKyAoc291cmNlLl9faWQgfHwgKHNvdXJjZS5fX2lkID0gc291cmNlU2VyaWFsSWQrKykpLFxyXG4gICAgICAgICAgICAgIGV2ZW50cyA9IGFuZ3VsYXIuaXNPYmplY3Qoc291cmNlKSAmJiBzb3VyY2UuZXZlbnRzO1xyXG4gICAgICAgICAgaWYgKGV2ZW50cykge1xyXG4gICAgICAgICAgICAgIGZwID0gZnAgKyAnLScgKyAoZXZlbnRzLl9faWQgfHwgKGV2ZW50cy5fX2lkID0gc291cmNlRXZlbnRzU2VyaWFsSWQrKykpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIGZwO1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgLy8gQHJldHVybiB7QXJyYXl9IGFsbCBldmVudHMgZnJvbSBhbGwgc291cmNlc1xyXG4gICAgICB0aGlzLmFsbEV2ZW50cyA9IGZ1bmN0aW9uKCkge1xyXG4gICAgICAgIC8vIGRvIHNvdXJjZXMubWFwKCY6ZXZlbnRzKS5mbGF0dGVuKCksIGJ1dCB3ZSBkb24ndCBoYXZlIGZsYXR0ZW5cclxuICAgICAgICB2YXIgYXJyYXlTb3VyY2VzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIHNyY0xlbiA9IHNvdXJjZXMubGVuZ3RoOyBpIDwgc3JjTGVuOyBpKyspIHtcclxuICAgICAgICAgIHZhciBzb3VyY2UgPSBzb3VyY2VzW2ldO1xyXG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNBcnJheShzb3VyY2UpKSB7XHJcbiAgICAgICAgICAgIC8vIGV2ZW50IHNvdXJjZSBhcyBhcnJheVxyXG4gICAgICAgICAgICBhcnJheVNvdXJjZXMucHVzaChzb3VyY2UpO1xyXG4gICAgICAgICAgfSBlbHNlIGlmKGFuZ3VsYXIuaXNPYmplY3Qoc291cmNlKSAmJiBhbmd1bGFyLmlzQXJyYXkoc291cmNlLmV2ZW50cykpe1xyXG4gICAgICAgICAgICAvLyBldmVudCBzb3VyY2UgYXMgb2JqZWN0LCBpZSBleHRlbmRlZCBmb3JtXHJcbiAgICAgICAgICAgIHZhciBleHRFdmVudCA9IHt9O1xyXG4gICAgICAgICAgICBmb3IodmFyIGtleSBpbiBzb3VyY2Upe1xyXG4gICAgICAgICAgICAgIGlmKGtleSAhPT0gJ19pZCcgJiYga2V5ICE9PSAnZXZlbnRzJyl7XHJcbiAgICAgICAgICAgICAgICAgZXh0RXZlbnRba2V5XSA9IHNvdXJjZVtrZXldO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IodmFyIGVJID0gMDtlSSA8IHNvdXJjZS5ldmVudHMubGVuZ3RoO2VJKyspe1xyXG4gICAgICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKHNvdXJjZS5ldmVudHNbZUldLGV4dEV2ZW50KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBhcnJheVNvdXJjZXMucHVzaChzb3VyY2UuZXZlbnRzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5jb25jYXQuYXBwbHkoW10sIGFycmF5U291cmNlcyk7XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBUcmFjayBjaGFuZ2VzIGluIGFycmF5IG9mIG9iamVjdHMgYnkgYXNzaWduaW5nIGlkIHRva2VucyB0byBlYWNoIGVsZW1lbnQgYW5kIHdhdGNoaW5nIHRoZSBzY29wZSBmb3IgY2hhbmdlcyBpbiB0aGUgdG9rZW5zXHJcbiAgICAgIC8vIEBwYXJhbSB7QXJyYXl8RnVuY3Rpb259IGFycmF5U291cmNlIGFycmF5IG9mIG9iamVjdHMgdG8gd2F0Y2hcclxuICAgICAgLy8gQHBhcmFtIHRva2VuRm4ge0Z1bmN0aW9ufSB0aGF0IHJldHVybnMgdGhlIHRva2VuIGZvciBhIGdpdmVuIG9iamVjdFxyXG4gICAgICAvLyBAcmV0dXJuIHtPYmplY3R9XHJcbiAgICAgIC8vICBzdWJzY3JpYmU6IGZ1bmN0aW9uKHNjb3BlLCBmdW5jdGlvbihuZXdUb2tlbnMsIG9sZFRva2VucykpXHJcbiAgICAgIC8vICAgIGNhbGxlZCB3aGVuIHNvdXJjZSBoYXMgY2hhbmdlZC4gcmV0dXJuIGZhbHNlIHRvIHByZXZlbnQgaW5kaXZpZHVhbCBjYWxsYmFja3MgZnJvbSBmaXJpbmdcclxuICAgICAgLy8gIG9uQWRkZWQvUmVtb3ZlZC9DaGFuZ2VkOlxyXG4gICAgICAvLyAgICB3aGVuIHNldCB0byBhIGNhbGxiYWNrLCBjYWxsZWQgZWFjaCBpdGVtIHdoZXJlIGEgcmVzcGVjdGl2ZSBjaGFuZ2UgaXMgZGV0ZWN0ZWRcclxuICAgICAgdGhpcy5jaGFuZ2VXYXRjaGVyID0gZnVuY3Rpb24oYXJyYXlTb3VyY2UsIHRva2VuRm4pIHtcclxuICAgICAgICB2YXIgc2VsZjtcclxuICAgICAgICB2YXIgZ2V0VG9rZW5zID0gZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICB2YXIgYXJyYXkgPSBhbmd1bGFyLmlzRnVuY3Rpb24oYXJyYXlTb3VyY2UpID8gYXJyYXlTb3VyY2UoKSA6IGFycmF5U291cmNlO1xyXG4gICAgICAgICAgdmFyIHJlc3VsdCA9IFtdLCB0b2tlbiwgZWw7XHJcbiAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGFycmF5Lmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBlbCA9IGFycmF5W2ldO1xyXG4gICAgICAgICAgICB0b2tlbiA9IHRva2VuRm4oZWwpO1xyXG4gICAgICAgICAgICBtYXBbdG9rZW5dID0gZWw7XHJcbiAgICAgICAgICAgIHJlc3VsdC5wdXNoKHRva2VuKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiByZXN1bHQ7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgLy8gQHBhcmFtIHtBcnJheX0gYVxyXG4gICAgICAgIC8vIEBwYXJhbSB7QXJyYXl9IGJcclxuICAgICAgICAvLyBAcmV0dXJuIHtBcnJheX0gZWxlbWVudHMgaW4gdGhhdCBhcmUgaW4gYSBidXQgbm90IGluIGJcclxuICAgICAgICAvLyBAZXhhbXBsZVxyXG4gICAgICAgIC8vICBzdWJ0cmFjdEFzU2V0cyhbNiwgMTAwLCA0LCA1XSwgWzQsIDUsIDddKSAvLyBbNiwgMTAwXVxyXG4gICAgICAgIHZhciBzdWJ0cmFjdEFzU2V0cyA9IGZ1bmN0aW9uKGEsIGIpIHtcclxuICAgICAgICAgIHZhciByZXN1bHQgPSBbXSwgaW5CID0ge30sIGksIG47XHJcbiAgICAgICAgICBmb3IgKGkgPSAwLCBuID0gYi5sZW5ndGg7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgaW5CW2JbaV1dID0gdHJ1ZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGZvciAoaSA9IDAsIG4gPSBhLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoIWluQlthW2ldXSkge1xyXG4gICAgICAgICAgICAgIHJlc3VsdC5wdXNoKGFbaV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIC8vIE1hcCBvYmplY3RzIHRvIHRva2VucyBhbmQgdmljZS12ZXJzYVxyXG4gICAgICAgIHZhciBtYXAgPSB7fTtcclxuXHJcbiAgICAgICAgLy8gQ29tcGFyZSBuZXdUb2tlbnMgdG8gb2xkVG9rZW5zIGFuZCBjYWxsIG9uQWRkZWQsIG9uUmVtb3ZlZCwgYW5kIG9uQ2hhbmdlZCBoYW5kbGVycyBmb3IgZWFjaCBhZmZlY3RlZCBldmVudCByZXNwZWN0aXZlbHkuXHJcbiAgICAgICAgdmFyIGFwcGx5Q2hhbmdlcyA9IGZ1bmN0aW9uKG5ld1Rva2Vucywgb2xkVG9rZW5zKSB7XHJcbiAgICAgICAgICB2YXIgaSwgbiwgZWwsIHRva2VuO1xyXG4gICAgICAgICAgdmFyIHJlcGxhY2VkVG9rZW5zID0ge307XHJcbiAgICAgICAgICB2YXIgcmVtb3ZlZFRva2VucyA9IHN1YnRyYWN0QXNTZXRzKG9sZFRva2VucywgbmV3VG9rZW5zKTtcclxuICAgICAgICAgIGZvciAoaSA9IDAsIG4gPSByZW1vdmVkVG9rZW5zLmxlbmd0aDsgaSA8IG47IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgcmVtb3ZlZFRva2VuID0gcmVtb3ZlZFRva2Vuc1tpXTtcclxuICAgICAgICAgICAgZWwgPSBtYXBbcmVtb3ZlZFRva2VuXTtcclxuICAgICAgICAgICAgZGVsZXRlIG1hcFtyZW1vdmVkVG9rZW5dO1xyXG4gICAgICAgICAgICB2YXIgbmV3VG9rZW4gPSB0b2tlbkZuKGVsKTtcclxuICAgICAgICAgICAgLy8gaWYgdGhlIGVsZW1lbnQgd2Fzbid0IHJlbW92ZWQgYnV0IHNpbXBseSBnb3QgYSBuZXcgdG9rZW4sIGl0cyBvbGQgdG9rZW4gd2lsbCBiZSBkaWZmZXJlbnQgZnJvbSB0aGUgY3VycmVudCBvbmVcclxuICAgICAgICAgICAgaWYgKG5ld1Rva2VuID09PSByZW1vdmVkVG9rZW4pIHtcclxuICAgICAgICAgICAgICBzZWxmLm9uUmVtb3ZlZChlbCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgcmVwbGFjZWRUb2tlbnNbbmV3VG9rZW5dID0gcmVtb3ZlZFRva2VuO1xyXG4gICAgICAgICAgICAgIHNlbGYub25DaGFuZ2VkKGVsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBhZGRlZFRva2VucyA9IHN1YnRyYWN0QXNTZXRzKG5ld1Rva2Vucywgb2xkVG9rZW5zKTtcclxuICAgICAgICAgIGZvciAoaSA9IDAsIG4gPSBhZGRlZFRva2Vucy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgdG9rZW4gPSBhZGRlZFRva2Vuc1tpXTtcclxuICAgICAgICAgICAgZWwgPSBtYXBbdG9rZW5dO1xyXG4gICAgICAgICAgICBpZiAoIXJlcGxhY2VkVG9rZW5zW3Rva2VuXSkge1xyXG4gICAgICAgICAgICAgIHNlbGYub25BZGRlZChlbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBzZWxmID0ge1xyXG4gICAgICAgICAgc3Vic2NyaWJlOiBmdW5jdGlvbihzY29wZSwgb25BcnJheUNoYW5nZWQpIHtcclxuICAgICAgICAgICAgc2NvcGUuJHdhdGNoKGdldFRva2VucywgZnVuY3Rpb24obmV3VG9rZW5zLCBvbGRUb2tlbnMpIHtcclxuICAgICAgICAgICAgICB2YXIgbm90aWZ5ID0gIShvbkFycmF5Q2hhbmdlZCAmJiBvbkFycmF5Q2hhbmdlZChuZXdUb2tlbnMsIG9sZFRva2VucykgPT09IGZhbHNlKTtcclxuICAgICAgICAgICAgICBpZiAobm90aWZ5KSB7XHJcbiAgICAgICAgICAgICAgICBhcHBseUNoYW5nZXMobmV3VG9rZW5zLCBvbGRUb2tlbnMpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgdHJ1ZSk7XHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAgb25BZGRlZDogYW5ndWxhci5ub29wLFxyXG4gICAgICAgICAgb25DaGFuZ2VkOiBhbmd1bGFyLm5vb3AsXHJcbiAgICAgICAgICBvblJlbW92ZWQ6IGFuZ3VsYXIubm9vcFxyXG4gICAgICAgIH07XHJcbiAgICAgIH07XHJcblxyXG4gICAgICB0aGlzLmdldEZ1bGxDYWxlbmRhckNvbmZpZyA9IGZ1bmN0aW9uKGNhbGVuZGFyU2V0dGluZ3MsIHVpQ2FsZW5kYXJDb25maWcpe1xyXG4gICAgICAgICAgdmFyIGNvbmZpZyA9IHt9O1xyXG5cclxuICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKGNvbmZpZywgdWlDYWxlbmRhckNvbmZpZyk7XHJcbiAgICAgICAgICBhbmd1bGFyLmV4dGVuZChjb25maWcsIGNhbGVuZGFyU2V0dGluZ3MpO1xyXG5cclxuICAgICAgICAgIGFuZ3VsYXIuZm9yRWFjaChjb25maWcsIGZ1bmN0aW9uKHZhbHVlLGtleSl7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgdmFsdWUgPT09ICdmdW5jdGlvbicpe1xyXG4gICAgICAgICAgICAgIGNvbmZpZ1trZXldID0gd3JhcEZ1bmN0aW9uV2l0aFNjb3BlQXBwbHkoY29uZmlnW2tleV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICByZXR1cm4gY29uZmlnO1xyXG4gICAgICB9O1xyXG5cclxuICAgIHRoaXMuZ2V0TG9jYWxlQ29uZmlnID0gZnVuY3Rpb24oZnVsbENhbGVuZGFyQ29uZmlnKSB7XHJcbiAgICAgIGlmICghZnVsbENhbGVuZGFyQ29uZmlnLmxhbmcgfHwgZnVsbENhbGVuZGFyQ29uZmlnLnVzZU5nTG9jYWxlKSB7XHJcbiAgICAgICAgLy8gQ29uZmlndXJlIHRvIHVzZSBsb2NhbGUgbmFtZXMgYnkgZGVmYXVsdFxyXG4gICAgICAgIHZhciB0VmFsdWVzID0gZnVuY3Rpb24oZGF0YSkge1xyXG4gICAgICAgICAgLy8gY29udmVydCB7MDogXCJKYW5cIiwgMTogXCJGZWJcIiwgLi4ufSB0byBbXCJKYW5cIiwgXCJGZWJcIiwgLi4uXVxyXG4gICAgICAgICAgdmFyIHIsIGs7XHJcbiAgICAgICAgICByID0gW107XHJcbiAgICAgICAgICBmb3IgKGsgaW4gZGF0YSkge1xyXG4gICAgICAgICAgICByW2tdID0gZGF0YVtrXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiByO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdmFyIGR0ZiA9ICRsb2NhbGUuREFURVRJTUVfRk9STUFUUztcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgbW9udGhOYW1lczogdFZhbHVlcyhkdGYuTU9OVEgpLFxyXG4gICAgICAgICAgbW9udGhOYW1lc1Nob3J0OiB0VmFsdWVzKGR0Zi5TSE9SVE1PTlRIKSxcclxuICAgICAgICAgIGRheU5hbWVzOiB0VmFsdWVzKGR0Zi5EQVkpLFxyXG4gICAgICAgICAgZGF5TmFtZXNTaG9ydDogdFZhbHVlcyhkdGYuU0hPUlREQVkpXHJcbiAgICAgICAgfTtcclxuICAgICAgfVxyXG4gICAgICByZXR1cm4ge307XHJcbiAgICB9O1xyXG4gIH1dKVxyXG4gIC5kaXJlY3RpdmUoJ3VpQ2FsZW5kYXInLCBbJ3VpQ2FsZW5kYXJDb25maWcnLCBmdW5jdGlvbih1aUNhbGVuZGFyQ29uZmlnKSB7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICBzY29wZToge2V2ZW50U291cmNlczonPW5nTW9kZWwnLGNhbGVuZGFyV2F0Y2hFdmVudDogJyYnfSxcclxuICAgICAgY29udHJvbGxlcjogJ3VpQ2FsZW5kYXJDdHJsJyxcclxuICAgICAgbGluazogZnVuY3Rpb24oc2NvcGUsIGVsbSwgYXR0cnMsIGNvbnRyb2xsZXIpIHtcclxuXHJcbiAgICAgICAgdmFyIHNvdXJjZXMgPSBzY29wZS5ldmVudFNvdXJjZXMsXHJcbiAgICAgICAgICAgIHNvdXJjZXNDaGFuZ2VkID0gZmFsc2UsXHJcbiAgICAgICAgICAgIGNhbGVuZGFyLFxyXG4gICAgICAgICAgICBldmVudFNvdXJjZXNXYXRjaGVyID0gY29udHJvbGxlci5jaGFuZ2VXYXRjaGVyKHNvdXJjZXMsIGNvbnRyb2xsZXIuc291cmNlRmluZ2VycHJpbnQpLFxyXG4gICAgICAgICAgICBldmVudHNXYXRjaGVyID0gY29udHJvbGxlci5jaGFuZ2VXYXRjaGVyKGNvbnRyb2xsZXIuYWxsRXZlbnRzLCBjb250cm9sbGVyLmV2ZW50RmluZ2VycHJpbnQpLFxyXG4gICAgICAgICAgICBvcHRpb25zID0gbnVsbDtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZ2V0T3B0aW9ucygpe1xyXG4gICAgICAgICAgdmFyIGNhbGVuZGFyU2V0dGluZ3MgPSBhdHRycy51aUNhbGVuZGFyID8gc2NvcGUuJHBhcmVudC4kZXZhbChhdHRycy51aUNhbGVuZGFyKSA6IHt9LFxyXG4gICAgICAgICAgICAgIGZ1bGxDYWxlbmRhckNvbmZpZztcclxuXHJcbiAgICAgICAgICBmdWxsQ2FsZW5kYXJDb25maWcgPSBjb250cm9sbGVyLmdldEZ1bGxDYWxlbmRhckNvbmZpZyhjYWxlbmRhclNldHRpbmdzLCB1aUNhbGVuZGFyQ29uZmlnKTtcclxuXHJcbiAgICAgICAgICB2YXIgbG9jYWxlRnVsbENhbGVuZGFyQ29uZmlnID0gY29udHJvbGxlci5nZXRMb2NhbGVDb25maWcoZnVsbENhbGVuZGFyQ29uZmlnKTtcclxuICAgICAgICAgIGFuZ3VsYXIuZXh0ZW5kKGxvY2FsZUZ1bGxDYWxlbmRhckNvbmZpZywgZnVsbENhbGVuZGFyQ29uZmlnKTtcclxuICAgICAgICAgIG9wdGlvbnMgPSB7IGV2ZW50U291cmNlczogc291cmNlcyB9O1xyXG4gICAgICAgICAgYW5ndWxhci5leHRlbmQob3B0aW9ucywgbG9jYWxlRnVsbENhbGVuZGFyQ29uZmlnKTtcclxuICAgICAgICAgIC8vcmVtb3ZlIGNhbGVuZGFycyBmcm9tIG9wdGlvbnNcclxuICAgICAgICAgIG9wdGlvbnMuY2FsZW5kYXJzID0gbnVsbDtcclxuXHJcbiAgICAgICAgICB2YXIgb3B0aW9uczIgPSB7fTtcclxuICAgICAgICAgIGZvcih2YXIgbyBpbiBvcHRpb25zKXtcclxuICAgICAgICAgICAgaWYobyAhPT0gJ2V2ZW50U291cmNlcycpe1xyXG4gICAgICAgICAgICAgIG9wdGlvbnMyW29dID0gb3B0aW9uc1tvXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KG9wdGlvbnMyKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLmRlc3Ryb3kgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgaWYoY2FsZW5kYXIgJiYgY2FsZW5kYXIuZnVsbENhbGVuZGFyKXtcclxuICAgICAgICAgICAgY2FsZW5kYXIuZnVsbENhbGVuZGFyKCdkZXN0cm95Jyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZihhdHRycy5jYWxlbmRhcikge1xyXG4gICAgICAgICAgICBjYWxlbmRhciA9IHVpQ2FsZW5kYXJDb25maWcuY2FsZW5kYXJzW2F0dHJzLmNhbGVuZGFyXSA9ICQoZWxtKS5odG1sKCcnKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNhbGVuZGFyID0gJChlbG0pLmh0bWwoJycpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHNjb3BlLmluaXQgPSBmdW5jdGlvbigpe1xyXG4gICAgICAgICAgY2FsZW5kYXIuZnVsbENhbGVuZGFyKG9wdGlvbnMpO1xyXG4gICAgICAgICAgaWYoYXR0cnMuY2FsZW5kYXIpIHtcclxuICAgICAgICAgICAgdWlDYWxlbmRhckNvbmZpZy5jYWxlbmRhcnNbYXR0cnMuY2FsZW5kYXJdID0gY2FsZW5kYXI7XHJcbiAgICAgICAgICB9ICAgICAgICAgIFxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGV2ZW50U291cmNlc1dhdGNoZXIub25BZGRlZCA9IGZ1bmN0aW9uKHNvdXJjZSkge1xyXG4gICAgICAgICAgY2FsZW5kYXIuZnVsbENhbGVuZGFyKCdhZGRFdmVudFNvdXJjZScsIHNvdXJjZSk7XHJcbiAgICAgICAgICBzb3VyY2VzQ2hhbmdlZCA9IHRydWU7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZXZlbnRTb3VyY2VzV2F0Y2hlci5vblJlbW92ZWQgPSBmdW5jdGlvbihzb3VyY2UpIHtcclxuICAgICAgICAgIGNhbGVuZGFyLmZ1bGxDYWxlbmRhcigncmVtb3ZlRXZlbnRTb3VyY2UnLCBzb3VyY2UpO1xyXG4gICAgICAgICAgc291cmNlc0NoYW5nZWQgPSB0cnVlO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGV2ZW50U291cmNlc1dhdGNoZXIub25DaGFuZ2VkID0gZnVuY3Rpb24oc291cmNlKSB7XHJcbiAgICAgICAgICBjYWxlbmRhci5mdWxsQ2FsZW5kYXIoJ3JlZmV0Y2hFdmVudHMnKTtcclxuICAgICAgICAgIHNvdXJjZXNDaGFuZ2VkID0gdHJ1ZTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBldmVudHNXYXRjaGVyLm9uQWRkZWQgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgY2FsZW5kYXIuZnVsbENhbGVuZGFyKCdyZW5kZXJFdmVudCcsIGV2ZW50LCAoZXZlbnQuc3RpY2sgPyB0cnVlIDogZmFsc2UpKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBldmVudHNXYXRjaGVyLm9uUmVtb3ZlZCA9IGZ1bmN0aW9uKGV2ZW50KSB7XHJcbiAgICAgICAgICBjYWxlbmRhci5mdWxsQ2FsZW5kYXIoJ3JlbW92ZUV2ZW50cycsIGV2ZW50Ll9pZCk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgZXZlbnRzV2F0Y2hlci5vbkNoYW5nZWQgPSBmdW5jdGlvbihldmVudCkge1xyXG4gICAgICAgICAgZXZlbnQuX3N0YXJ0ID0galF1ZXJ5LmZ1bGxDYWxlbmRhci5tb21lbnQoZXZlbnQuc3RhcnQpO1xyXG4gICAgICAgICAgZXZlbnQuX2VuZCA9IGpRdWVyeS5mdWxsQ2FsZW5kYXIubW9tZW50KGV2ZW50LmVuZCk7XHJcbiAgICAgICAgICBjYWxlbmRhci5mdWxsQ2FsZW5kYXIoJ3VwZGF0ZUV2ZW50JywgZXZlbnQpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIGV2ZW50U291cmNlc1dhdGNoZXIuc3Vic2NyaWJlKHNjb3BlKTtcclxuICAgICAgICBldmVudHNXYXRjaGVyLnN1YnNjcmliZShzY29wZSwgZnVuY3Rpb24oKSB7XHJcbiAgICAgICAgICBpZiAoc291cmNlc0NoYW5nZWQgPT09IHRydWUpIHtcclxuICAgICAgICAgICAgc291cmNlc0NoYW5nZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgLy8gcmV0dXJuIGZhbHNlIHRvIHByZXZlbnQgb25BZGRlZC9SZW1vdmVkL0NoYW5nZWQgaGFuZGxlcnMgZnJvbSBmaXJpbmcgaW4gdGhpcyBjYXNlXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgc2NvcGUuJHdhdGNoKGdldE9wdGlvbnMsIGZ1bmN0aW9uKG5ld08sb2xkTyl7XHJcbiAgICAgICAgICAgIHNjb3BlLmRlc3Ryb3koKTtcclxuICAgICAgICAgICAgc2NvcGUuaW5pdCgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9O1xyXG59XSk7XHJcbiJdfQ==
