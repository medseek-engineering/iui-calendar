var rootDir = __dirname + '/';

var moduleName = 'iui-calendar';

module.exports = {
  
  config: function(conf) {
    'use strict';
    console.log('Using ' + moduleName + ' directives');

    if (conf.client.head.settings &&
        conf.client.head.settings.combine &&
        conf.client.head.addlPathedScripts) {
      conf.client.head.addlPathedScripts.push(rootDir + 'dist/core-module-setup.js');
      conf.client.head.addlPathedScripts.push(rootDir + 'dist/iui-module.js');
    } else {
      var boom = conf.client.app.root + '$' + moduleName + '/dist/core-module-setup.js';
      console.log('boom',boom);
      conf.client.head.scripts.push(boom);
      conf.client.head.scripts.push(conf.client.app.root + '$' + moduleName + '/dist/iui-module.min.js');
    }
  },

  app: function(app, conf) {
    'use strict';
    app.get('/\\$' + moduleName +'/*', function(req, res) {
      res.sendfile(rootDir + req.params[0]);
    });
  }
};