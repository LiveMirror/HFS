// libs
GLOBAL.vfs = new (require('./vfs').Vfs)();
vfs.root.set('C:\\data\\pics').add('C:\\temp');
var fileServer = require('./file-server');
var adminServer = require('./admin-server');

var listenOn = {port:8, ip:'0.0.0.0'};
var adminOn = {port:88, ip:'0.0.0.0'};

fileServer.start(listenOn);
adminServer.start(adminOn);
