require('./common');
var http = require('http');

var srv = http.createServer(function(req,res){
    var peer = req.socket.address();
    dbg('serving '+peer.address+':'+peer.port+' '+req.url);

    vfs.uri2disk(req.url, function(path){
        var stream = fs.createReadStream(path);
        if (!stream) {
            res.writeHead(404);
            res.end();
            return;
        }
        res.writeHead(200, {'Content-Type': 'application/octet-stream'});
        util.pump(stream, res, function(){ res.end() });
    });
});
srv.on('error', function(err){
    switch (err.code) {
        case 'EADDRINUSE':
            return dbg('port '+listenOn.port+' busy');
    }
});

exports.start = function(listenOn) {
    srv.listen(listenOn.port, listenOn.ip, function(){
        dbg('listening on port '+listenOn.port);
    });
}
