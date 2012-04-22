require('./common');
var http = require('http');
var url = require('url');
var socket_io = require('socket.io');

var listeningOn;

var mimeTypes = {
    'jpg,jpeg': 'image/jpeg',
    'gif': 'image/gif',
    'png': 'image/png',
    'css': 'text/css',
    'js': 'text/javascript', 
};

var srv = http.createServer(function(httpReq,httpRes){
    var peer = httpReq.socket.address();
    dbg('serving '+peer.address+':'+peer.port+' '+httpReq.url);
    
    httpReq.parsedUrl = url.parse(httpReq.url, true);

    var fn = serveVirtual;
    if (httpReq.parsedUrl.pathname.substr(0,3) == '/~/') {
        fn = serveStatic;        
        httpReq.parsedUrl.pathname = httpReq.parsedUrl.pathname.substr(2);
    }
    fn.apply(this, arguments); 

});
srv.on('error', function(err){
    switch (err.code) {
        case 'EADDRINUSE':
            return dbg('port '+listeningOn.port+' busy');
    }
});
var io = socket_io.listen(srv);
io.sockets.on('connection', function(socket){
    socket.on('get list', function(d,cb){
        vfs.fromUrl(d.path, function(fnode) {
            getReplyForFolder(fnode, function(reply){
                cb(reply);                
            });  
        });
    });
});

exports.start = function(listenOn) {
    listeningOn = listenOn;
    srv.listen(listenOn.port, listenOn.ip, function onListen(){
        dbg('listening on port '+listenOn.port);
    });
}

function getReplyForFolder(folder, cb) {
    if (!folder) {
        return cb({error:'not found'});
    }
    if (typeof folder.directoryLoaded != 'object') {
        if (folder.isOnDisk()) { // for real folders we must first load files
            fs.readdir(folder.resource, function onReaddir(err, files) { // read them
                assert(!err, 'err'); // ** handle it!
                folder.directoryLoaded = files;
                getReplyForFolder(folder, cb); // restart
            });
            return; // recurring, break this flow
        }
        folder.directoryLoaded = []; // this is a virtual folder, so there is no directory to load from disk
    }    

    var reply = {};
    
    // collect all items
    var items = reply.items = {};
    folder.directoryLoaded.forEach(function(e){
        items[e] = {};
    });
    folder.getChildren().forEach(function(e){
        items[e.name] = {
            resource: e.resource,
            // in the future we should rename 'type' in 't' and 'size' in 's' to save bandwidth on common fieldnames
            type: e.fileKind.replace('virtual ',''), // this is a quick and dirty method to get value as file|folder|link
        };        
    });
    // collect more data about items
    var left = 0;    
    items.forEach(function(e, name) {
        //e.relativeUrl = encodeURI(name);  // why should we send what the client can easily calculate?
        if (e.type == 'link') {
            e.url = e.resource;
            return;
        }        
        var pth = e.resource || path.join(folder.resource, name);
        delete e.resource; // we must not show this to the client
        ++left; // keep track of async callbacks 
        fs.stat(pth, function onStat(err,stats){
            //dbg(pth+' '+err);
            --left;
            if (err) {
                delete item[name];
            }
            else {
                // we already know the type, or determine it by the stats
                e.type = e.type || (stats.isDirectory() ? 'folder' : 'file');                    
                if (e.type == 'folder') {
                    if (e.relativeUrl) e.relativeUrl += '/';
                } else { 
                    e.size = stats.size;
                }
            }

            if (!left) {
                delete folder.directoryLoaded; // clean it
                cb(reply);
            } 
        });//stat
    });
} // getReplyForFolder

function mimeFor(file) {
    var ext = path.extname(file).substr(1).toLowerCase();
    for (var w in mimeTypes) {
        if (w.split(',').indexOf(ext) >= 0) {
            return mimeTypes[w];
        }
    }
    return false;
} // mimeFor

function serveVirtual(httpReq, httpRes) {
    vfs.fromUrl(httpReq.parsedUrl.pathname, function urlCB(node){
        if (!node) {
            httpRes.writeHead(404);
            httpRes.end();
            return;
        }

        if (node.isFile()) {
            var path = node.resource;
            var stream = fs.createReadStream(path);
            httpRes.writeHead(200, {
                'Content-Length': node.stats.size,
                'Content-Type': mimeFor(path) || 'application/octet-stream',
            });
            util.pump(stream, httpRes, function(){ httpRes.end() });
            return;
        }
        
        assert(node.isFolder(), 'must be folder');
        fs.readFile('static/frontend.html', function(err, data){
            if (err) {
                httpRes.writeHead(500);
                return httpRes.end('error');
            }
            httpRes.writeHead(200);
            httpRes.end(data);
        });
    });
} // serveVirtual

function serveStatic(httpReq, httpRes) {
    var f = 'static/'+httpReq.parsedUrl.pathname;
    fs.readFile(f, function(err, data){
        if (dbg(err)) {
            httpRes.writeHead(404);
            return httpRes.end('error');
        }
        httpRes.writeHead(200, {
            'Content-Length': data.length,
            'Content-Type': mimeFor(f) || 'application/octet-stream',
        });
        httpRes.end(data);
    });
} // serveStatic
