///////// ESTENDING STRING

/* costruisce una nuova stringa partendo da this e infilando dentro i valori dati come parametro.
    La sintassi delle sottostringhe è nella forma {key} oppure {key|parametri}.
    Se il primo parametro è un oggetto allora "key" viene cercato tra i membri dell'oggetto,
    altrimenti "key" rappresenta l'indice (zero-based) del parametro passato alla funzione.  
    I parametri possono essere di 2 forme:
        \d*-\d* allora indica un range di caratteri da estrarre
        altrimenti è considerato una chiave dell'oggetto/array   
*/
String.prototype.format = function() {
    var args = arguments;
    if (typeof args[0] == 'object')
        args = args[0];
    return this.replace(/\{([_ a-z0-9]+)(\|([^}]+))?\}/gi, function(){
        var ret = args[arguments[1]];
        var par = arguments[3]; 
        if (par) {
            var v = /(\d*)-(\d*)/.exec(par); // vediamo se è nella forma "range"
            if (v) ret = ret.substring(v[1]-1 || 0, v[2] || ret.length); // estraiamo il range 
            else ret = ret[par]; // semplice accesso al campo
        }
        return ret; 
    });
};

String.prototype.repeat = function(n) {
    var r = '';
    for (var i=0; i<n; i++) r += this;
    return r;
};

String.prototype.count = function(sub) {
    return this.split(sub).length-1;
};

String.prototype.ss = function(from, to) {
    return this.substring(from<0 ? this.length-from : from, to<0 ? this.length+to : to);
};

String.prototype.pad = function(lngt, filler) {
    return (filler || ' ').repeat(Math.max(0,lngt - this.length)) + this;
};

String.prototype.escapeRegExp = function() {
    return this.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

String.prototype.startsBy = function(sub, caseInsensitive) {
    return 0 <= this.search(new RegExp('^'+sub.escapeRegExp(), caseInsensitive ? 'i' : ''));  
};
 
String.prototype.endsBy = function(sub, caseInsensitive) {
    return 0 <= this.search(new RegExp(sub.escapeRegExp()+'$', caseInsensitive ? 'i' : ''));  
};

String.prototype.includeLeading = function(sub) { return this.startsBy(sub) ? this : sub+this }; 
String.prototype.includeTrailing = function(sub) { return this.endsBy(sub) ? this : this+sub };
// if in the following function the casting to string is not made, the resulting typeof is 'object' instead of 'string' (causing problems in some cases, e.g. using path.join)
String.prototype.excludeLeading = function(sub) { return this.startsBy(sub) ? this.slice(sub.length) : ''+this }; 
String.prototype.excludeTrailing = function(sub) { return this.endsBy(sub) ? this.slice(0,-sub.length) : ''+this }; 

// handy shortcuts
String.prototype.low = String.prototype.toLowerCase;
String.prototype.up = String.prototype.toUpperCase;

String.prototype.same = function(s){ return typeof s === 'string' && this.low() === s.low(); };

///////// ESTENDING OBJECT

function extendObject(key, value) {
    Object.defineProperty(Object.prototype, key, {
        enumerable: false,    
        value: value
    });
} // extendObject

extendObject('keyOf', function(value) {
    for (var i in this)
        if (this.hasOwnProperty(i) 
        && this[i] === value)
            return i;
    return null; 
}); // Object.keyOf

extendObject('forEach', function(cb) {
    for (var i in this)
        if (this.hasOwnProperty(i))
            cb(this[i], i);
}); // Object.forEach

extendObject('isIn', function(vals) {
    if (arguments.length == 1) {
        return Array.isArray(vals)
            ? vals.indexOf(this) >= 0
            : vals.keyOf(this) !== null;   
    }
    for (var i in arguments)    
        if (arguments[i] == this)
            return true;
    return false;    
}); // Object.isIn

extendObject('extend', function(from) {
    var props = Object.getOwnPropertyNames(from);
    var dest = this;
    props.forEach(function(name) {
        if (name in dest) {
            var destination = Object.getOwnPropertyDescriptor(from, name);
            Object.defineProperty(dest, name, destination);
        }
    });
    return this;
}); // Object.extend



// parametri: max oppure min,max 
exports.rand =  function() {
    var r = Math.random();
    switch (arguments.length) {
        case 0: return r;
        case 1: return Math.round(r*arguments[0]);
        default: return arguments[0]+Math.round(r*(arguments[1]-arguments[0]));
    }
} // rand

exports.validEmail = function(s) {
    return !!s.match(/^[-A-Z0-9_.]+@[-A-Z0-9_.]+\.[A-Z]{2,4}$/i);
}; // validEmail

exports.count = function(obj) {
    if (typeof obj != 'object')
        return false;
    var i = 0;
    for (var p in obj)
        if (obj.hasOwnProperty(p)) 
            ++i;
    return i;
} // count

// esegue effect solo quando condition è true
exports.waitFor = function(condition, effect, options) {
    options = options||{};
    // teniamo un array di timer handler, indicizzati dalla condition
    var k = condition;
    if (!waitFor.h)
        waitFor.h = {};
    else if (waitFor.h[k])
        clearInterval(waitFor.h[k]);
    waitFor.h[k] = setInterval(function(){
        if (typeof condition == 'string' ? eval(condition) : condition()) {
            clearInterval(waitFor.h[k]);
            if (typeof effect == 'string') eval(effect)
            else effect();
        }
    }, options.time||300);
    return waitFor.h[k];
} // waitFor

exports.round = function(v, decimals) {
    decimals = Math.pow(10, decimals||0);
    return Math.round(v*decimals)/decimals;
} // round

exports.time = function() { return (new Date()).getTime() }

// incapsula una funzione, per evitare che venga richiamata troppo spesso
exports.delayedCall = function(delay, fun, options) {
    options = options||{};
    var res = function(){
        var args = arguments, _this = this;
        if (!res.last) {
            if (typeof options.start == 'function') options.start();
        }
        else {
            clearTimeout(res.last);
            res.last = 0;
        }
        res.last = setTimeout(function(){ 
            res.last = 0; 
            if (typeof options.over == 'function') options.over();
            fun.apply(_this, args);
        }, delay);
    };
    return res; 
}; // delayedCall


////// UTILITIES WE WANT TO BE GLOBAL

GLOBAL.ABCifB = function(a,b,c) { return b ? ''+a+b+(c||'') : ''; } 

// forma più comoda di console.log, con più parametri, e che restituisce il primo parametro (per concatenzaione)
GLOBAL.log = function() {
    for (var k in arguments)
        console.log(arguments[k]);
    for (var k in arguments)
        return arguments[k];
}; // log

// accetta un parametro (string) per ogni valore, oppure i valori come unica stringa divisa da uno spazio
GLOBAL.Enum = function() {
    var a = (arguments.length == 1) ? arguments[0].split(' ') : arguments;
    var res = {};
    for (var i=0,l=a.length; i<l; ++i) {
        res[a[i]] = a[i].toLowerCase().replace('_',' '); // valore descrittivo, utile per eventuali output
    }
    return res; 
}; // Enum

GLOBAL.assert = function(condition, message) {
    if (condition) return;
}; // assert
