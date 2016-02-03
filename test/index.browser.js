(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var foreign = require('foreign'),
    cpsenize = require('cpsenize');

function isRighto(x){
    return typeof x === 'function' && x.get === x;
}

function righto(fn){
    var args = Array.prototype.slice.call(arguments, 1),
        context = this,
        started = 0,
        callbacks = [],
        results;

    function get(callback){
        if(results){
            return callback.apply(context, results);
        }

        callbacks.push(callback);

        if(started++){
            return;
        }


        foreign.parallel(function(task, done){
            if(isRighto(task)){
                return task(function(error){
                    done(error, Array.prototype.slice.call(arguments, 1));
                });
            }

            if(Array.isArray(task) && isRighto(task[0])  && !isRighto(task[1])){
                return task[0](function(error){
                    var args = Array.prototype.slice.call(arguments, 1);
                    done(error, task.slice(1).map(function(key){
                        return args[key];
                    }));
                });
            }

            return done(null, task);
        }, args, function(error, argResults){
            if(error){
                return callbacks.forEach(function(callback){
                    callback(error);
                });
            }

            argResults = [].concat.apply([], argResults);

            argResults.push(function(){
                results = arguments;
                callbacks.forEach(function(callback){
                    callback.apply(context, results);
                });
            });

            fn.apply(null, argResults);
        });
    };

    get.get = get;

    return get;
}

righto.sync = function(fn){
    return righto.apply(null, [cpsenize(fn)].concat(Array.prototype.slice.call(arguments, 1)));
};

righto.all = function(task){
    function resolve(tasks){
        return righto.apply(null, [function(){
            arguments[arguments.length - 1](null, Array.prototype.slice.call(arguments, 0, -1));
        }].concat(tasks));
    }

    if(isRighto(task)){
        return righto(function(tasks, done){
            resolve(tasks)(done);
        }, task);
    }

    return resolve(task);
};

module.exports = righto;
},{"cpsenize":2,"foreign":3}],2:[function(require,module,exports){

function cpsenize(fn){
    return function(){
        var args = Array.prototype.slice.call(arguments),
            callback = args.pop(),
            context = this,
            result,
            error;

        try {
            result = fn.apply(context, args);
        }
        catch(exception){
            error = exception;
        }

        callback(error, result);
    };
}

module.exports = cpsenize;
},{}],3:[function(require,module,exports){
function parallel(fn, items, callback){
    if(!items || typeof items !== 'object'){
        throw new Error('Items must be an object or an array');
    }

    var keys = Object.keys(items),
        isArray = Array.isArray(items),
        length = isArray ? items.length : keys.length,
        finalResult = new items.constructor(),
        done = 0,
        errored;

    if(length === 0){
        return callback(null, finalResult);
    }

    function isDone(key){
        return function(error, result){

            if(errored){
                return;
            }

            if(error){
                errored = true;
                return callback(error);
            }

            finalResult[key] = arguments.length > 2 ? Array.prototype.slice.call(arguments, 1) : result;

            if(++done === length){
                callback(null, finalResult);
            }
        };
    }

    for (var i = 0; i < length; i++) {
        var key = keys[i];
        if(isArray && isNaN(key)){
            continue;
        }

        fn(items[key], isDone(key));
    }
}

function series(fn, items, callback){
    if(!items || typeof items !== 'object'){
        throw new Error('Items must be an object or an array');
    }

    var keys = Object.keys(items),
        isArray = Array.isArray(items),
        length = isArray ? items.length : keys.length,
        finalResult = new items.constructor();

    if(length === 0){
        return callback(null, finalResult);
    }

    function next(index){
        var key = keys[index];

        index++;

        if(isArray && isNaN(key)){
            return next(index);
        }

        fn(items[keys[key]], function (error, result) {
            if(error){
                return callback(error);
            }

            finalResult[key] = arguments.length > 2 ? Array.prototype.slice.call(arguments, 1) : result;

            if(index === length){
                return callback(null, finalResult);
            }

            next(index);
        });
    }

    next(0);
}

module.exports = {
    parallel: parallel,
    series: series
};
},{}],4:[function(require,module,exports){
var righto = require('../');

function asyncify(fn){
    setTimeout(fn, Math.random() * 1000);
}

// function getStuff(callback){
//     asyncify(function(){
//         callback(null, 3);
//     });
// }

// function getOtherStuff(callback){
//     asyncify(function(){
//         callback(null, 7);
//     });
// }

// function getThingsWithStuff(a, b, callback){
//     asyncify(function(){
//         callback(null, a + b);
//     });
// }

// var stuff = righto(getStuff),
//     otherStuff = righto(getOtherStuff);


// var thingsWithStuff = righto(getThingsWithStuff, stuff, otherStuff);

// thingsWithStuff(function(error, result){
//     console.log(error, result);
// });

// thingsWithStuff(function(error, result){
//     console.log(error, result);
// });

// function bar(callback){
//     asyncify(function(){
//         callback(null, 2, 3);
//     });
// }

// function foo(callback){
//     asyncify(function(){
//         callback(null, 'hello');
//     });
// }

// var getBar = righto(bar);

// var getFoo = righto(foo, [getBar]);

// getFoo(function(){
//     console.log(arguments);
// });

var a = righto(function(callback){
    asyncify(function(){
        callback(new Error('BEWM'));
        // callback(null, 'a');
    });
});

var b = righto(function(callback){
    asyncify(function(){
        callback(null, 'b');
    });
});

var c = righto(function(callback){
    asyncify(function(){
        callback(null, 'c');
    });
});



var all = righto.all([a, b, c]);

all(function(error, results){
    console.log(error, results);
});




var getAll = righto.sync(function(){
    return [a, b, c];
});

var all2 = righto.all(getAll);

all2(function(error, results){
    console.log(error, results);
});
},{"../":1}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9jcHNlbml6ZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mb3JlaWduL2luZGV4LmpzIiwidGVzdC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBmb3JlaWduID0gcmVxdWlyZSgnZm9yZWlnbicpLFxuICAgIGNwc2VuaXplID0gcmVxdWlyZSgnY3BzZW5pemUnKTtcblxuZnVuY3Rpb24gaXNSaWdodG8oeCl7XG4gICAgcmV0dXJuIHR5cGVvZiB4ID09PSAnZnVuY3Rpb24nICYmIHguZ2V0ID09PSB4O1xufVxuXG5mdW5jdGlvbiByaWdodG8oZm4pe1xuICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICAgICAgY29udGV4dCA9IHRoaXMsXG4gICAgICAgIHN0YXJ0ZWQgPSAwLFxuICAgICAgICBjYWxsYmFja3MgPSBbXSxcbiAgICAgICAgcmVzdWx0cztcblxuICAgIGZ1bmN0aW9uIGdldChjYWxsYmFjayl7XG4gICAgICAgIGlmKHJlc3VsdHMpe1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrLmFwcGx5KGNvbnRleHQsIHJlc3VsdHMpO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2tzLnB1c2goY2FsbGJhY2spO1xuXG4gICAgICAgIGlmKHN0YXJ0ZWQrKyl7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cblxuXG4gICAgICAgIGZvcmVpZ24ucGFyYWxsZWwoZnVuY3Rpb24odGFzaywgZG9uZSl7XG4gICAgICAgICAgICBpZihpc1JpZ2h0byh0YXNrKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhc2soZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICBkb25lKGVycm9yLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYoQXJyYXkuaXNBcnJheSh0YXNrKSAmJiBpc1JpZ2h0byh0YXNrWzBdKSAgJiYgIWlzUmlnaHRvKHRhc2tbMV0pKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGFza1swXShmdW5jdGlvbihlcnJvcil7XG4gICAgICAgICAgICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICAgICAgICAgICAgICAgICAgZG9uZShlcnJvciwgdGFzay5zbGljZSgxKS5tYXAoZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhcmdzW2tleV07XG4gICAgICAgICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGRvbmUobnVsbCwgdGFzayk7XG4gICAgICAgIH0sIGFyZ3MsIGZ1bmN0aW9uKGVycm9yLCBhcmdSZXN1bHRzKXtcbiAgICAgICAgICAgIGlmKGVycm9yKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2tzLmZvckVhY2goZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjayhlcnJvcik7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGFyZ1Jlc3VsdHMgPSBbXS5jb25jYXQuYXBwbHkoW10sIGFyZ1Jlc3VsdHMpO1xuXG4gICAgICAgICAgICBhcmdSZXN1bHRzLnB1c2goZnVuY3Rpb24oKXtcbiAgICAgICAgICAgICAgICByZXN1bHRzID0gYXJndW1lbnRzO1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkoY29udGV4dCwgcmVzdWx0cyk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgZm4uYXBwbHkobnVsbCwgYXJnUmVzdWx0cyk7XG4gICAgICAgIH0pO1xuICAgIH07XG5cbiAgICBnZXQuZ2V0ID0gZ2V0O1xuXG4gICAgcmV0dXJuIGdldDtcbn1cblxucmlnaHRvLnN5bmMgPSBmdW5jdGlvbihmbil7XG4gICAgcmV0dXJuIHJpZ2h0by5hcHBseShudWxsLCBbY3BzZW5pemUoZm4pXS5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSkpO1xufTtcblxucmlnaHRvLmFsbCA9IGZ1bmN0aW9uKHRhc2spe1xuICAgIGZ1bmN0aW9uIHJlc29sdmUodGFza3Mpe1xuICAgICAgICByZXR1cm4gcmlnaHRvLmFwcGx5KG51bGwsIFtmdW5jdGlvbigpe1xuICAgICAgICAgICAgYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXShudWxsLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDAsIC0xKSk7XG4gICAgICAgIH1dLmNvbmNhdCh0YXNrcykpO1xuICAgIH1cblxuICAgIGlmKGlzUmlnaHRvKHRhc2spKXtcbiAgICAgICAgcmV0dXJuIHJpZ2h0byhmdW5jdGlvbih0YXNrcywgZG9uZSl7XG4gICAgICAgICAgICByZXNvbHZlKHRhc2tzKShkb25lKTtcbiAgICAgICAgfSwgdGFzayk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlc29sdmUodGFzayk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHJpZ2h0bzsiLCJcbmZ1bmN0aW9uIGNwc2VuaXplKGZuKXtcbiAgICByZXR1cm4gZnVuY3Rpb24oKXtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpLFxuICAgICAgICAgICAgY2FsbGJhY2sgPSBhcmdzLnBvcCgpLFxuICAgICAgICAgICAgY29udGV4dCA9IHRoaXMsXG4gICAgICAgICAgICByZXN1bHQsXG4gICAgICAgICAgICBlcnJvcjtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzdWx0ID0gZm4uYXBwbHkoY29udGV4dCwgYXJncyk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2goZXhjZXB0aW9uKXtcbiAgICAgICAgICAgIGVycm9yID0gZXhjZXB0aW9uO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FsbGJhY2soZXJyb3IsIHJlc3VsdCk7XG4gICAgfTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcHNlbml6ZTsiLCJmdW5jdGlvbiBwYXJhbGxlbChmbiwgaXRlbXMsIGNhbGxiYWNrKXtcbiAgICBpZighaXRlbXMgfHwgdHlwZW9mIGl0ZW1zICE9PSAnb2JqZWN0Jyl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSXRlbXMgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYW4gYXJyYXknKTtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGl0ZW1zKSxcbiAgICAgICAgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkoaXRlbXMpLFxuICAgICAgICBsZW5ndGggPSBpc0FycmF5ID8gaXRlbXMubGVuZ3RoIDoga2V5cy5sZW5ndGgsXG4gICAgICAgIGZpbmFsUmVzdWx0ID0gbmV3IGl0ZW1zLmNvbnN0cnVjdG9yKCksXG4gICAgICAgIGRvbmUgPSAwLFxuICAgICAgICBlcnJvcmVkO1xuXG4gICAgaWYobGVuZ3RoID09PSAwKXtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGZpbmFsUmVzdWx0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0RvbmUoa2V5KXtcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uKGVycm9yLCByZXN1bHQpe1xuXG4gICAgICAgICAgICBpZihlcnJvcmVkKXtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKGVycm9yKXtcbiAgICAgICAgICAgICAgICBlcnJvcmVkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmaW5hbFJlc3VsdFtrZXldID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogcmVzdWx0O1xuXG4gICAgICAgICAgICBpZigrK2RvbmUgPT09IGxlbmd0aCl7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2sobnVsbCwgZmluYWxSZXN1bHQpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaV07XG4gICAgICAgIGlmKGlzQXJyYXkgJiYgaXNOYU4oa2V5KSl7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZuKGl0ZW1zW2tleV0sIGlzRG9uZShrZXkpKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHNlcmllcyhmbiwgaXRlbXMsIGNhbGxiYWNrKXtcbiAgICBpZighaXRlbXMgfHwgdHlwZW9mIGl0ZW1zICE9PSAnb2JqZWN0Jyl7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSXRlbXMgbXVzdCBiZSBhbiBvYmplY3Qgb3IgYW4gYXJyYXknKTtcbiAgICB9XG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGl0ZW1zKSxcbiAgICAgICAgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkoaXRlbXMpLFxuICAgICAgICBsZW5ndGggPSBpc0FycmF5ID8gaXRlbXMubGVuZ3RoIDoga2V5cy5sZW5ndGgsXG4gICAgICAgIGZpbmFsUmVzdWx0ID0gbmV3IGl0ZW1zLmNvbnN0cnVjdG9yKCk7XG5cbiAgICBpZihsZW5ndGggPT09IDApe1xuICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZmluYWxSZXN1bHQpO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIG5leHQoaW5kZXgpe1xuICAgICAgICB2YXIga2V5ID0ga2V5c1tpbmRleF07XG5cbiAgICAgICAgaW5kZXgrKztcblxuICAgICAgICBpZihpc0FycmF5ICYmIGlzTmFOKGtleSkpe1xuICAgICAgICAgICAgcmV0dXJuIG5leHQoaW5kZXgpO1xuICAgICAgICB9XG5cbiAgICAgICAgZm4oaXRlbXNba2V5c1trZXldXSwgZnVuY3Rpb24gKGVycm9yLCByZXN1bHQpIHtcbiAgICAgICAgICAgIGlmKGVycm9yKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBmaW5hbFJlc3VsdFtrZXldID0gYXJndW1lbnRzLmxlbmd0aCA+IDIgPyBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpIDogcmVzdWx0O1xuXG4gICAgICAgICAgICBpZihpbmRleCA9PT0gbGVuZ3RoKXtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobnVsbCwgZmluYWxSZXN1bHQpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBuZXh0KGluZGV4KTtcbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgbmV4dCgwKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgcGFyYWxsZWw6IHBhcmFsbGVsLFxuICAgIHNlcmllczogc2VyaWVzXG59OyIsInZhciByaWdodG8gPSByZXF1aXJlKCcuLi8nKTtcblxuZnVuY3Rpb24gYXN5bmNpZnkoZm4pe1xuICAgIHNldFRpbWVvdXQoZm4sIE1hdGgucmFuZG9tKCkgKiAxMDAwKTtcbn1cblxuLy8gZnVuY3Rpb24gZ2V0U3R1ZmYoY2FsbGJhY2spe1xuLy8gICAgIGFzeW5jaWZ5KGZ1bmN0aW9uKCl7XG4vLyAgICAgICAgIGNhbGxiYWNrKG51bGwsIDMpO1xuLy8gICAgIH0pO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBnZXRPdGhlclN0dWZmKGNhbGxiYWNrKXtcbi8vICAgICBhc3luY2lmeShmdW5jdGlvbigpe1xuLy8gICAgICAgICBjYWxsYmFjayhudWxsLCA3KTtcbi8vICAgICB9KTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gZ2V0VGhpbmdzV2l0aFN0dWZmKGEsIGIsIGNhbGxiYWNrKXtcbi8vICAgICBhc3luY2lmeShmdW5jdGlvbigpe1xuLy8gICAgICAgICBjYWxsYmFjayhudWxsLCBhICsgYik7XG4vLyAgICAgfSk7XG4vLyB9XG5cbi8vIHZhciBzdHVmZiA9IHJpZ2h0byhnZXRTdHVmZiksXG4vLyAgICAgb3RoZXJTdHVmZiA9IHJpZ2h0byhnZXRPdGhlclN0dWZmKTtcblxuXG4vLyB2YXIgdGhpbmdzV2l0aFN0dWZmID0gcmlnaHRvKGdldFRoaW5nc1dpdGhTdHVmZiwgc3R1ZmYsIG90aGVyU3R1ZmYpO1xuXG4vLyB0aGluZ3NXaXRoU3R1ZmYoZnVuY3Rpb24oZXJyb3IsIHJlc3VsdCl7XG4vLyAgICAgY29uc29sZS5sb2coZXJyb3IsIHJlc3VsdCk7XG4vLyB9KTtcblxuLy8gdGhpbmdzV2l0aFN0dWZmKGZ1bmN0aW9uKGVycm9yLCByZXN1bHQpe1xuLy8gICAgIGNvbnNvbGUubG9nKGVycm9yLCByZXN1bHQpO1xuLy8gfSk7XG5cbi8vIGZ1bmN0aW9uIGJhcihjYWxsYmFjayl7XG4vLyAgICAgYXN5bmNpZnkoZnVuY3Rpb24oKXtcbi8vICAgICAgICAgY2FsbGJhY2sobnVsbCwgMiwgMyk7XG4vLyAgICAgfSk7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIGZvbyhjYWxsYmFjayl7XG4vLyAgICAgYXN5bmNpZnkoZnVuY3Rpb24oKXtcbi8vICAgICAgICAgY2FsbGJhY2sobnVsbCwgJ2hlbGxvJyk7XG4vLyAgICAgfSk7XG4vLyB9XG5cbi8vIHZhciBnZXRCYXIgPSByaWdodG8oYmFyKTtcblxuLy8gdmFyIGdldEZvbyA9IHJpZ2h0byhmb28sIFtnZXRCYXJdKTtcblxuLy8gZ2V0Rm9vKGZ1bmN0aW9uKCl7XG4vLyAgICAgY29uc29sZS5sb2coYXJndW1lbnRzKTtcbi8vIH0pO1xuXG52YXIgYSA9IHJpZ2h0byhmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgYXN5bmNpZnkoZnVuY3Rpb24oKXtcbiAgICAgICAgY2FsbGJhY2sobmV3IEVycm9yKCdCRVdNJykpO1xuICAgICAgICAvLyBjYWxsYmFjayhudWxsLCAnYScpO1xuICAgIH0pO1xufSk7XG5cbnZhciBiID0gcmlnaHRvKGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICBhc3luY2lmeShmdW5jdGlvbigpe1xuICAgICAgICBjYWxsYmFjayhudWxsLCAnYicpO1xuICAgIH0pO1xufSk7XG5cbnZhciBjID0gcmlnaHRvKGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICBhc3luY2lmeShmdW5jdGlvbigpe1xuICAgICAgICBjYWxsYmFjayhudWxsLCAnYycpO1xuICAgIH0pO1xufSk7XG5cblxuXG52YXIgYWxsID0gcmlnaHRvLmFsbChbYSwgYiwgY10pO1xuXG5hbGwoZnVuY3Rpb24oZXJyb3IsIHJlc3VsdHMpe1xuICAgIGNvbnNvbGUubG9nKGVycm9yLCByZXN1bHRzKTtcbn0pO1xuXG5cblxuXG52YXIgZ2V0QWxsID0gcmlnaHRvLnN5bmMoZnVuY3Rpb24oKXtcbiAgICByZXR1cm4gW2EsIGIsIGNdO1xufSk7XG5cbnZhciBhbGwyID0gcmlnaHRvLmFsbChnZXRBbGwpO1xuXG5hbGwyKGZ1bmN0aW9uKGVycm9yLCByZXN1bHRzKXtcbiAgICBjb25zb2xlLmxvZyhlcnJvciwgcmVzdWx0cyk7XG59KTsiXX0=
