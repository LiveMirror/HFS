var fs = require('fs');
var util = require('util');

// simile a log(), ma scrive su file, accumulando lungo l'arco della singola esecuzione del programma
GLOBAL.dbg = function(/*pre, */s) {
    var out = s;
    if (arguments.length == 2) {
        out = arguments[0]+': '+arguments[1];
        s = arguments[1];
    }
    var self = arguments.callee;
    if (!self.once) {
        self.once = 1;
        self.fn = 'dbg.txt';
        fs.unlink(self.fn);
    }
    fs.createWriteStream(self.fn, {flags:'a'}).write(out+"\n");
    console.log(out);
    return s;
}; // dbg

// type-independent size calculation
GLOBAL.sizeOf = function(o) {
    if (util.isArray(o))
        return o.length;
    return Object.keys(o).length;  
}; // sizeOf

os.isWindows = function(){ return os.platform() == 'win32' };

String.prototype.wildcardsToRegExp = function() {
    var re = this.replace(/[-[\]{}()+.,\\^$|#\s]/g, '\\$&')
        .replace('*','.*')
        .replace('?','.');
    return new RegExp('^'+re+'$');
}; // wildcardsToRegExp 
