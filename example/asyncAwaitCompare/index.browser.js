(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = function(html){
    document.body.innerHTML += html;
}
},{}],2:[function(require,module,exports){
module.exports = function(text){
    document.body.appendChild(document.createTextNode(text));
}
},{}],3:[function(require,module,exports){
var files = {
    'story.json': {
        heading: '<h1>Heading</h1>',
        chapterURLs:[
            '1.txt',
            '2.txt',
            '3.txt'
        ]
    },
    '1.txt': '<p>Foo</p>',
    '2.txt': '<p>Bar</p>',
    '3.txt': '<p>Baz</p>'
};

module.exports = function(url, callback){
    setTimeout(function(){
        if(Math.random() * 10 < 1){
            return callback(new Error('Load failed - ' + url));
        }
        callback(null, files[url]);
    }, Math.random() * 500 + 500);
}
},{}],4:[function(require,module,exports){
var getJSON = require('./getJSON');
var addHtmlToPage = require('./addHtmlToPage');
var addTextToPage = require('./addTextToPage');

// Righto version of this: http://jakearchibald.com/2014/es7-async-functions/

var righto = require('../');

function loadStory(){
    var getStory = righto(getJSON, 'story.json'),
        addHeading = righto.sync(story => addHtmlToPage(story.heading), getStory),
        addChapters = righto.all(righto.sync(story =>
            story.chapterURLs.map(chapterUrl => righto(getJSON, chapterUrl))
            .reduce((result, getChapter) => righto.sync(addHtmlToPage, getChapter, [result]), null)
        , getStory));

    righto.all(addHeading, addChapters)(error => {
        document.querySelector('.spinner').style.display = 'none';
        error ? addTextToPage("Argh, broken: " + error.message) : addTextToPage('All done');
    });
}

window.addEventListener('load', loadStory);
},{"../":5,"./addHtmlToPage":1,"./addTextToPage":2,"./getJSON":3}],5:[function(require,module,exports){
var foreign = require('foreign'),
    cpsenize = require('cpsenize');

function isRighto(x){
    return typeof x === 'function' && x.get === x;
}

function slice(list, start, end){
    return Array.prototype.slice.call(list, start, end);
}

function righto(fn){
    var args = slice(arguments, 1),
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
                    done(error, slice(arguments, 1));
                });
            }

            if(Array.isArray(task) && isRighto(task[0])  && !isRighto(task[1])){
                return task[0](function(error){
                    var args = slice(arguments, 1);
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
    return righto.apply(null, [cpsenize(fn)].concat(slice(arguments, 1)));
};

righto.all = function(task){
    if(arguments.length > 1){
        task = slice(arguments);
    }
    function resolve(tasks){
        return righto.apply(null, [function(){
            arguments[arguments.length - 1](null, slice(arguments, 0, -1));
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
},{"cpsenize":6,"foreign":7}],6:[function(require,module,exports){

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
},{}],7:[function(require,module,exports){
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
},{}]},{},[4])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJleGFtcGxlL2FkZEh0bWxUb1BhZ2UuanMiLCJleGFtcGxlL2FkZFRleHRUb1BhZ2UuanMiLCJleGFtcGxlL2dldEpTT04uanMiLCJleGFtcGxlL2luZGV4LmpzIiwiaW5kZXguanMiLCJub2RlX21vZHVsZXMvY3BzZW5pemUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZm9yZWlnbi9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKGh0bWwpe1xuICAgIGRvY3VtZW50LmJvZHkuaW5uZXJIVE1MICs9IGh0bWw7XG59IiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbih0ZXh0KXtcbiAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHRleHQpKTtcbn0iLCJ2YXIgZmlsZXMgPSB7XG4gICAgJ3N0b3J5Lmpzb24nOiB7XG4gICAgICAgIGhlYWRpbmc6ICc8aDE+SGVhZGluZzwvaDE+JyxcbiAgICAgICAgY2hhcHRlclVSTHM6W1xuICAgICAgICAgICAgJzEudHh0JyxcbiAgICAgICAgICAgICcyLnR4dCcsXG4gICAgICAgICAgICAnMy50eHQnXG4gICAgICAgIF1cbiAgICB9LFxuICAgICcxLnR4dCc6ICc8cD5Gb288L3A+JyxcbiAgICAnMi50eHQnOiAnPHA+QmFyPC9wPicsXG4gICAgJzMudHh0JzogJzxwPkJhejwvcD4nXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHVybCwgY2FsbGJhY2spe1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKXtcbiAgICAgICAgaWYoTWF0aC5yYW5kb20oKSAqIDEwIDwgMSl7XG4gICAgICAgICAgICByZXR1cm4gY2FsbGJhY2sobmV3IEVycm9yKCdMb2FkIGZhaWxlZCAtICcgKyB1cmwpKTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjayhudWxsLCBmaWxlc1t1cmxdKTtcbiAgICB9LCBNYXRoLnJhbmRvbSgpICogNTAwICsgNTAwKTtcbn0iLCJ2YXIgZ2V0SlNPTiA9IHJlcXVpcmUoJy4vZ2V0SlNPTicpO1xudmFyIGFkZEh0bWxUb1BhZ2UgPSByZXF1aXJlKCcuL2FkZEh0bWxUb1BhZ2UnKTtcbnZhciBhZGRUZXh0VG9QYWdlID0gcmVxdWlyZSgnLi9hZGRUZXh0VG9QYWdlJyk7XG5cbi8vIFJpZ2h0byB2ZXJzaW9uIG9mIHRoaXM6IGh0dHA6Ly9qYWtlYXJjaGliYWxkLmNvbS8yMDE0L2VzNy1hc3luYy1mdW5jdGlvbnMvXG5cbnZhciByaWdodG8gPSByZXF1aXJlKCcuLi8nKTtcblxuZnVuY3Rpb24gbG9hZFN0b3J5KCl7XG4gICAgdmFyIGdldFN0b3J5ID0gcmlnaHRvKGdldEpTT04sICdzdG9yeS5qc29uJyksXG4gICAgICAgIGFkZEhlYWRpbmcgPSByaWdodG8uc3luYyhzdG9yeSA9PiBhZGRIdG1sVG9QYWdlKHN0b3J5LmhlYWRpbmcpLCBnZXRTdG9yeSksXG4gICAgICAgIGFkZENoYXB0ZXJzID0gcmlnaHRvLmFsbChyaWdodG8uc3luYyhzdG9yeSA9PlxuICAgICAgICAgICAgc3RvcnkuY2hhcHRlclVSTHMubWFwKGNoYXB0ZXJVcmwgPT4gcmlnaHRvKGdldEpTT04sIGNoYXB0ZXJVcmwpKVxuICAgICAgICAgICAgLnJlZHVjZSgocmVzdWx0LCBnZXRDaGFwdGVyKSA9PiByaWdodG8uc3luYyhhZGRIdG1sVG9QYWdlLCBnZXRDaGFwdGVyLCBbcmVzdWx0XSksIG51bGwpXG4gICAgICAgICwgZ2V0U3RvcnkpKTtcblxuICAgIHJpZ2h0by5hbGwoYWRkSGVhZGluZywgYWRkQ2hhcHRlcnMpKGVycm9yID0+IHtcbiAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNwaW5uZXInKS5zdHlsZS5kaXNwbGF5ID0gJ25vbmUnO1xuICAgICAgICBlcnJvciA/IGFkZFRleHRUb1BhZ2UoXCJBcmdoLCBicm9rZW46IFwiICsgZXJyb3IubWVzc2FnZSkgOiBhZGRUZXh0VG9QYWdlKCdBbGwgZG9uZScpO1xuICAgIH0pO1xufVxuXG53aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsIGxvYWRTdG9yeSk7IiwidmFyIGZvcmVpZ24gPSByZXF1aXJlKCdmb3JlaWduJyksXG4gICAgY3BzZW5pemUgPSByZXF1aXJlKCdjcHNlbml6ZScpO1xuXG5mdW5jdGlvbiBpc1JpZ2h0byh4KXtcbiAgICByZXR1cm4gdHlwZW9mIHggPT09ICdmdW5jdGlvbicgJiYgeC5nZXQgPT09IHg7XG59XG5cbmZ1bmN0aW9uIHNsaWNlKGxpc3QsIHN0YXJ0LCBlbmQpe1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChsaXN0LCBzdGFydCwgZW5kKTtcbn1cblxuZnVuY3Rpb24gcmlnaHRvKGZuKXtcbiAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSksXG4gICAgICAgIGNvbnRleHQgPSB0aGlzLFxuICAgICAgICBzdGFydGVkID0gMCxcbiAgICAgICAgY2FsbGJhY2tzID0gW10sXG4gICAgICAgIHJlc3VsdHM7XG5cbiAgICBmdW5jdGlvbiBnZXQoY2FsbGJhY2spe1xuICAgICAgICBpZihyZXN1bHRzKXtcbiAgICAgICAgICAgIHJldHVybiBjYWxsYmFjay5hcHBseShjb250ZXh0LCByZXN1bHRzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcblxuICAgICAgICBpZihzdGFydGVkKyspe1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cblxuICAgICAgICBmb3JlaWduLnBhcmFsbGVsKGZ1bmN0aW9uKHRhc2ssIGRvbmUpe1xuICAgICAgICAgICAgaWYoaXNSaWdodG8odGFzaykpe1xuICAgICAgICAgICAgICAgIHJldHVybiB0YXNrKGZ1bmN0aW9uKGVycm9yKXtcbiAgICAgICAgICAgICAgICAgICAgZG9uZShlcnJvciwgc2xpY2UoYXJndW1lbnRzLCAxKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmKEFycmF5LmlzQXJyYXkodGFzaykgJiYgaXNSaWdodG8odGFza1swXSkgICYmICFpc1JpZ2h0byh0YXNrWzFdKSl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRhc2tbMF0oZnVuY3Rpb24oZXJyb3Ipe1xuICAgICAgICAgICAgICAgICAgICB2YXIgYXJncyA9IHNsaWNlKGFyZ3VtZW50cywgMSk7XG4gICAgICAgICAgICAgICAgICAgIGRvbmUoZXJyb3IsIHRhc2suc2xpY2UoMSkubWFwKGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gYXJnc1trZXldO1xuICAgICAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBkb25lKG51bGwsIHRhc2spO1xuICAgICAgICB9LCBhcmdzLCBmdW5jdGlvbihlcnJvciwgYXJnUmVzdWx0cyl7XG4gICAgICAgICAgICBpZihlcnJvcil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrcy5mb3JFYWNoKGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBhcmdSZXN1bHRzID0gW10uY29uY2F0LmFwcGx5KFtdLCBhcmdSZXN1bHRzKTtcblxuICAgICAgICAgICAgYXJnUmVzdWx0cy5wdXNoKGZ1bmN0aW9uKCl7XG4gICAgICAgICAgICAgICAgcmVzdWx0cyA9IGFyZ3VtZW50cztcbiAgICAgICAgICAgICAgICBjYWxsYmFja3MuZm9yRWFjaChmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrLmFwcGx5KGNvbnRleHQsIHJlc3VsdHMpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIGZuLmFwcGx5KG51bGwsIGFyZ1Jlc3VsdHMpO1xuICAgICAgICB9KTtcbiAgICB9O1xuXG4gICAgZ2V0LmdldCA9IGdldDtcblxuICAgIHJldHVybiBnZXQ7XG59XG5cbnJpZ2h0by5zeW5jID0gZnVuY3Rpb24oZm4pe1xuICAgIHJldHVybiByaWdodG8uYXBwbHkobnVsbCwgW2Nwc2VuaXplKGZuKV0uY29uY2F0KHNsaWNlKGFyZ3VtZW50cywgMSkpKTtcbn07XG5cbnJpZ2h0by5hbGwgPSBmdW5jdGlvbih0YXNrKXtcbiAgICBpZihhcmd1bWVudHMubGVuZ3RoID4gMSl7XG4gICAgICAgIHRhc2sgPSBzbGljZShhcmd1bWVudHMpO1xuICAgIH1cbiAgICBmdW5jdGlvbiByZXNvbHZlKHRhc2tzKXtcbiAgICAgICAgcmV0dXJuIHJpZ2h0by5hcHBseShudWxsLCBbZnVuY3Rpb24oKXtcbiAgICAgICAgICAgIGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV0obnVsbCwgc2xpY2UoYXJndW1lbnRzLCAwLCAtMSkpO1xuICAgICAgICB9XS5jb25jYXQodGFza3MpKTtcbiAgICB9XG5cbiAgICBpZihpc1JpZ2h0byh0YXNrKSl7XG4gICAgICAgIHJldHVybiByaWdodG8oZnVuY3Rpb24odGFza3MsIGRvbmUpe1xuICAgICAgICAgICAgcmVzb2x2ZSh0YXNrcykoZG9uZSk7XG4gICAgICAgIH0sIHRhc2spO1xuICAgIH1cblxuICAgIHJldHVybiByZXNvbHZlKHRhc2spO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSByaWdodG87IiwiXG5mdW5jdGlvbiBjcHNlbml6ZShmbil7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCl7XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSxcbiAgICAgICAgICAgIGNhbGxiYWNrID0gYXJncy5wb3AoKSxcbiAgICAgICAgICAgIGNvbnRleHQgPSB0aGlzLFxuICAgICAgICAgICAgcmVzdWx0LFxuICAgICAgICAgICAgZXJyb3I7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIHJlc3VsdCA9IGZuLmFwcGx5KGNvbnRleHQsIGFyZ3MpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoKGV4Y2VwdGlvbil7XG4gICAgICAgICAgICBlcnJvciA9IGV4Y2VwdGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNhbGxiYWNrKGVycm9yLCByZXN1bHQpO1xuICAgIH07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3BzZW5pemU7IiwiZnVuY3Rpb24gcGFyYWxsZWwoZm4sIGl0ZW1zLCBjYWxsYmFjayl7XG4gICAgaWYoIWl0ZW1zIHx8IHR5cGVvZiBpdGVtcyAhPT0gJ29iamVjdCcpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0l0ZW1zIG11c3QgYmUgYW4gb2JqZWN0IG9yIGFuIGFycmF5Jyk7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhpdGVtcyksXG4gICAgICAgIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGl0ZW1zKSxcbiAgICAgICAgbGVuZ3RoID0gaXNBcnJheSA/IGl0ZW1zLmxlbmd0aCA6IGtleXMubGVuZ3RoLFxuICAgICAgICBmaW5hbFJlc3VsdCA9IG5ldyBpdGVtcy5jb25zdHJ1Y3RvcigpLFxuICAgICAgICBkb25lID0gMCxcbiAgICAgICAgZXJyb3JlZDtcblxuICAgIGlmKGxlbmd0aCA9PT0gMCl7XG4gICAgICAgIHJldHVybiBjYWxsYmFjayhudWxsLCBmaW5hbFJlc3VsdCk7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaXNEb25lKGtleSl7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihlcnJvciwgcmVzdWx0KXtcblxuICAgICAgICAgICAgaWYoZXJyb3JlZCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZihlcnJvcil7XG4gICAgICAgICAgICAgICAgZXJyb3JlZCA9IHRydWU7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZmluYWxSZXN1bHRba2V5XSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSA6IHJlc3VsdDtcblxuICAgICAgICAgICAgaWYoKytkb25lID09PSBsZW5ndGgpe1xuICAgICAgICAgICAgICAgIGNhbGxiYWNrKG51bGwsIGZpbmFsUmVzdWx0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBrZXkgPSBrZXlzW2ldO1xuICAgICAgICBpZihpc0FycmF5ICYmIGlzTmFOKGtleSkpe1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICBmbihpdGVtc1trZXldLCBpc0RvbmUoa2V5KSk7XG4gICAgfVxufVxuXG5mdW5jdGlvbiBzZXJpZXMoZm4sIGl0ZW1zLCBjYWxsYmFjayl7XG4gICAgaWYoIWl0ZW1zIHx8IHR5cGVvZiBpdGVtcyAhPT0gJ29iamVjdCcpe1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0l0ZW1zIG11c3QgYmUgYW4gb2JqZWN0IG9yIGFuIGFycmF5Jyk7XG4gICAgfVxuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhpdGVtcyksXG4gICAgICAgIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KGl0ZW1zKSxcbiAgICAgICAgbGVuZ3RoID0gaXNBcnJheSA/IGl0ZW1zLmxlbmd0aCA6IGtleXMubGVuZ3RoLFxuICAgICAgICBmaW5hbFJlc3VsdCA9IG5ldyBpdGVtcy5jb25zdHJ1Y3RvcigpO1xuXG4gICAgaWYobGVuZ3RoID09PSAwKXtcbiAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGZpbmFsUmVzdWx0KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBuZXh0KGluZGV4KXtcbiAgICAgICAgdmFyIGtleSA9IGtleXNbaW5kZXhdO1xuXG4gICAgICAgIGluZGV4Kys7XG5cbiAgICAgICAgaWYoaXNBcnJheSAmJiBpc05hTihrZXkpKXtcbiAgICAgICAgICAgIHJldHVybiBuZXh0KGluZGV4KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGZuKGl0ZW1zW2tleXNba2V5XV0sIGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0KSB7XG4gICAgICAgICAgICBpZihlcnJvcil7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVycm9yKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZmluYWxSZXN1bHRba2V5XSA9IGFyZ3VtZW50cy5sZW5ndGggPiAyID8gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSA6IHJlc3VsdDtcblxuICAgICAgICAgICAgaWYoaW5kZXggPT09IGxlbmd0aCl7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKG51bGwsIGZpbmFsUmVzdWx0KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbmV4dChpbmRleCk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIG5leHQoMCk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIHBhcmFsbGVsOiBwYXJhbGxlbCxcbiAgICBzZXJpZXM6IHNlcmllc1xufTsiXX0=
