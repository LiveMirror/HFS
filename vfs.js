require('./common');

function FileNode(nodeKind/*, name*/) {
    this.nodeKind = nodeKind;
    this.fileKind = FK.VIRTUAL_FOLDER;
    this.set(arguments[1] || '');
    this.children = []; // as a list. An object with fast access by name would be nice, but it would not work for case-sensitive OSs  
    this.deleted = [];
    this.permissions = {};
    this.options
}; // FileNode

NK = FileNode.NODE_KIND = Enum('FIXED TEMP SEMITEMP MOD');
FK = FileNode.FILE_KIND = Enum('FILE FOLDER VIRTUAL_FILE VIRTUAL_FOLDER LINK');

FileNode.prototype.__defineSetter__('name', function(v){
    this.customName = (v == this.getExpectedName()) ? null : v;
});
FileNode.prototype.__defineGetter__('name', function(){
    return this.customName || this.getExpectedName();
});

FileNode.prototype.getExpectedName = function() {
    return !this.isUnit() ? path.basename(this.resource) : this.resource; 
};

FileNode.prototype.isRoot = function() { return !this.parent };
FileNode.prototype.isFolder = function() { return this.fileKind.isIn(FK.FOLDER, FK.VIRTUAL_FOLDER) };
FileNode.prototype.isFile = function() { return this.fileKind.isIn(FK.FILE, FK.VIRTUAL_FILE) };
FileNode.prototype.isLink = function() { return this.fileKind == FK.LINK };
FileNode.prototype.isOnDisk = function() { return this.fileKind.isIn(FK.FILE, FK.FOLDER) };
FileNode.prototype.isVirtual = function() { return this.fileKind.isIn(FK.VIRTUAL_FILE, FK.VIRTUAL_FOLDER) };

FileNode.prototype.toString = function() { return "FileNode({name})".format(this) };

FileNode.prototype.isUnit = function() {
    return os.isWindows()
        && this.resource
        && this.resource.length == 2
        && this.resource[1] == ':';
};

FileNode.prototype.setPath = function(what, cb/*optional*/) {
    this.resource = path.normalize(what);
    this.name = null;

    this.stats = null; // 'null' stands for non-calculated
    this.fileKind = null;
    var x = this;    
    fs.stat(this.resource, function onStat(err,stats){
        x.stats = err ? false : stats; // 'false' stands for 'error'
        x.fileKind = (!err && stats.isDirectory()) ? FK.FOLDER : FK.FILE;
        if (cb) cb.call(x);
    });

    return this;
}; // setPath

FileNode.prototype.set = function(what, cb/*optional*/) {
    if (what.match(/[\\\/]/)) { // we know it's a path because of the slashes
        this.setPath(what, cb);
    }
    else {
        this.name = what;
        this.resource = null;
        this.fileKind = FK.VIRTUAL_FOLDER; 
        if (cb) cb.call(this);
    }
    return this;
}; // set

FileNode.prototype.add = function(what, cb/*optional*/) {
    // create child
    var fn = new FileNode(NK.FIXED);
    // link back and forth
    this.children.push(fn);
    fn.parent = this;
    // init
    var x = this;
    fn.set(what, function onSet(){
        if (cb) cb.call(fn);                
    });
    
    return this;    
}; // add

FileNode.prototype.getChildByName = function(name) {
    for (var i=0, a=this.children, l=a.length; i<l; ++i) {
        var v = a[i];
        if (name.same(v.name)) {
            return v;
        }
    }
    return false;
}; // getChildByName

// return children as an array. This is not only to ensure it's a copy (to protect the real property) but also to hide the detail that children is an array (in case this changes in the future)
FileNode.prototype.getChildren = function() { return this.children.slice() };

// compares filenames accordingly to the operating system's case policy
FileNode.prototype.testName = function(name) {
    return os.isWindows() ? name.same(this.name) : name == this.name;
}; // testName

FileNode.prototype.hasDeleted = function(name) {
    for (var i=0, a=this.deleted, l=a.length; i<l; ++i) {
        if (this.name.same(a[i].name)) {
            return true;
        }
    }
    return false;
}; // testName

FileNode.prototype.createFileNodeFromRelativeUri = function(uri, cb) {
    assert(cb, 'no cb');
    var p = path.join(this.resource, decodeURI(uri).excludeTrailing('/'));
    path.exists(p, function(yes){
        if (yes) {
            var fn = new FileNode(NK.TEMP);
            fn.set(p, cb.bind(fn));
            return;
        }
        cb(null);
    });

    return this;
}; // createFileNodeFromRelativeUri
 
exports.Vfs = Vfs = function(){
    this.root = new FileNode(NK.FIXED);
}; // Vfs

Vfs.prototype.fromUrl = function(url, cb) {
    assert(cb, 'no cb');
    var separator = 0;
    var run = this.root;
    while (separator < url.length-1) {
        var from = separator+1;
        var nextSep = url.indexOf('/', from);
        if (nextSep < 0) {
            nextSep = url.length;
        }
        var piece = url.substring(from, nextSep);
        if (piece && !run.isFolder() // something has left but we cannot go deeper
        || run.hasDeleted(piece)) { 
            cb(false);
            return this;
        }
        var child = run.getChildByName(piece);
        if (!child && run.isOnDisk()) { // if not in the VFS tree, try to fill the gap with the disk
            run.createFileNodeFromRelativeUri(url.substring(from), function(newNode){
                cb(newNode || false);
            });
            return this;
        }
        if (!child) { // we did our best
            cb(false);
            return this;
        }
        run = child; 
        separator = nextSep;
    }
    cb(run);
    return this;
}; // fromUrl

 
