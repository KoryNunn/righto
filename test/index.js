var test = require('tape'),
    consoleWatch = require('console-watch');
    righto = require('../');

function asyncify(fn){
    setTimeout(fn, Math.random() * 10);
}

function catchOnce(callback){
    if(typeof window === 'undefined'){
        process.once('uncaughtException', callback);
    }else{
        window.onerror = function(error){
            window.onerror = null;
            callback(error);
        };
    }
}
var windowError = typeof window !== 'undefined' && 'Script error.';

var globalkeys = Object.keys(global);

test('dependencies', function(t){
    t.plan(7);

    function getStuff(callback){
        asyncify(function(){
            t.pass('getStuff called');
            callback(null, 3);
        });
    }

    function getOtherStuff(callback){
        asyncify(function(){
            t.pass('getOtherStuff called');
            callback(null, 7);
        });
    }

    function getThingsWithStuff(a, b, callback){
        asyncify(function(){
            t.pass('getThingsWithStuff called');
            callback(null, a + b);
        });
    }

    var stuff = righto(getStuff),
        otherStuff = righto(getOtherStuff);

    var thingsWithStuff = righto(getThingsWithStuff, stuff, otherStuff);

    thingsWithStuff(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 10, 'Got correct result');
    });

    thingsWithStuff(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 10, 'Got correct result');
    });

});

test('ignored deps', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(callback){
        asyncify(function(){
            callback(null, 'hello');
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, [getBar]);

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 'hello', 'Got correct result');
    });

});

test('ignored deps with take', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(callback){
        asyncify(function(){
            callback(null, 'hello');
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, righto.take(getBar));

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 'hello', 'Got correct result');
    });

});

test('ignored deps with after', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(callback){
        asyncify(function(){
            callback(null, 'hello');
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, righto.after(getBar));

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 'hello', 'Got correct result');
    });

});

test('multiple deps', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(a, b, callback){
        asyncify(function(){
            callback(null, a - b);
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, [getBar, 0, 1]);

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, -1, 'Got correct result');
    });
});

test('multiple deps with take', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(a, b, callback){
        asyncify(function(){
            callback(null, a - b);
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, righto.take(getBar, 0, 1));

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, -1, 'Got correct result');
    });
});

test('multiple deps repeated', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(a, b, callback){
        asyncify(function(){
            callback(null, a - b);
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, [getBar, 1, 1]);

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 0, 'Got correct result');
    });
});

test('multiple deps repeated with take', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(a, b, callback){
        asyncify(function(){
            callback(null, a - b);
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, righto.take(getBar, 1, 1));

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 0, 'Got correct result');
    });
});

test('multiple deps reordered', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(a, b, callback){
        asyncify(function(){
            callback(null, a - b);
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, [getBar, 1, 0]);

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 1, 'Got correct result');
    });
});

test('multiple deps reordered with take', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(a, b, callback){
        asyncify(function(){
            callback(null, a - b);
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, righto.take(getBar, 1, 0));

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 1, 'Got correct result');
    });
});

test('multiple deps, default result', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 2, 3);
        });
    }

    function foo(a, callback){
        asyncify(function(){
            callback(null, a);
        });
    }

    var getBar = righto(bar);

    var getFoo = righto(foo, getBar);

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 2, 'Got correct result');
    });
});

test('multiple ignored deps with after', function(t){
    t.plan(2);

    function bar(callback){
        asyncify(function(){
            callback(null, 1);
        });
    }

    function baz(callback){
        asyncify(function(){
            callback(null, 2);
        });
    }

    function foo(callback){
        asyncify(function(){
            callback(null, 'dooby');
        });
    }

    var getBar = righto(bar);
    var getBaz = righto(baz);

    var getFoo = righto(foo, righto.after(getBar, getBaz));

    getFoo(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 'dooby', 'Got correct result');
    });
});

test('array dep result', function(t){
    t.plan(2);

    righto(function(first, second, third, callback){
        t.equal(arguments.length, 4);
        t.equal(typeof callback, 'function');
    }, 1, true, ['a', 'b'])(function(){

    });
})

var a = righto(function(callback){
        asyncify(function(){
            callback(null, 'a');
        });
    }),
    b = righto(function(callback){
        asyncify(function(){
            callback(null, 'b');
        });
    }),
    c = righto(function(callback){
        asyncify(function(){
            callback(null, 'c');
        });
    });

test('righto.all', function(t){
    t.plan(2);

    var all = righto.all([a, b, c]);

    all(function(error, results){
        t.notOk(error, 'no error');
        t.deepEqual(results, ['a','b','c'], 'Got correct results');
    });
});

test('righto.all righto deps', function(t){
    t.plan(2);

    var getAll = righto.sync(function(){
        return [a, b, c];
    });

    var all2 = righto.all(getAll);

    all2(function(error, results){
        t.notOk(error, 'no error');
        t.deepEqual(results, ['a','b','c'], 'Got correct results');
    });
});

test('righto().get(key)', function(t){
    t.plan(4);

    var getKey = righto(function(callback){
            asyncify(function(){
                t.pass('key gotten');
                callback(null, 'name');
            });
        });

    var getUser = righto(function(callback){
            asyncify(function(){
                t.pass('user gotten');
                callback(null, {name: 'bob', child:{ name: 'ben'}});
            });
        });

    var doThingWithName = righto(function(name1, name2, callback){
            asyncify(function(){
                callback(null, name1.toUpperCase() + ' ' + name2.toUpperCase());
            });
        }, getUser.get('child').get(getKey), getUser.get(getKey));

    doThingWithName(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 'BEN BOB', 'Got correct result');
    });
});

test('righto().get(fn)', function(t){
    t.plan(3);

    var getUser = righto(function(callback){
            asyncify(function(){
                t.pass('user gotten');
                callback(null, {name: 'bob', child:{ name: 'ben'}});
            });
        });

    var doThingWithName = righto(function(name, callback){
            asyncify(function(){
                callback(null, name.toUpperCase());
            });
        }, getUser.get(x => x.child.name));

    doThingWithName(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 'BEN', 'Got correct result');
    });
});

test('righto.from(value)', function(t){
    t.plan(2);

    var resolveValue = righto.from(10);

    resolveValue(function(error, result){
        t.notOk(error);
        t.equal(result, 10);
    })
});

test('no callback', function(t){
    t.plan(1);

    var doThing = righto(function(done){
            t.pass('Task ran correctly');
            done();
        });

    doThing();

});

test('non-function callback', function(t){
    t.plan(1);

    var didThing,
        doThing = righto(function(done){
            didThing = true;
            done();
        });

    t.throws(function(){
        doThing(null);
    }, 'Providing a non-function callback throws.');
});

test('mate', function(t){
    t.plan(3);

    function getStuff(callback){
        asyncify(function(){
            callback(null, 3);
        });
    }

    var stuff = righto(getStuff);

    function getOtherStuff(callback){
        asyncify(function(){
            callback(null, 7);
        });
    }

    var otherStuff = righto(getOtherStuff);

    var stuffAndOtherStuff = righto.mate(stuff, otherStuff);

    stuffAndOtherStuff(function(error, stuff, otherStuff){
        t.notOk(error);
        t.equal(stuff, 3);
        t.equal(otherStuff, 7);
    });
});

test('mate ignored', function(t){
    t.plan(3);

    function getStuff(callback){
        asyncify(function(){
            callback(null, 3);
        });
    }

    var stuff = righto(getStuff);

    function getOtherStuff(callback){
        asyncify(function(){
            callback(null, 7);
        });
    }

    var otherStuff = righto(getOtherStuff);

    var stuffAfterOtherStuff = righto.mate(stuff, [otherStuff]);

    stuffAfterOtherStuff(function(error, stuff, shouldBeUndefined){
        t.notOk(error);
        t.equal(stuff, 3);
        t.equal(shouldBeUndefined, undefined);
    });
});

test('mate ignored only', function(t){
    t.plan(1);

    function getStuff(callback){
        asyncify(function(){
            callback(null, 3);
        });
    }

    var stuff = righto(getStuff);

    var ignoredStuff = righto.mate([stuff]);

    ignoredStuff(function(error){
        t.equal(arguments.length, 1);
    });
});

test('mate ignored error', function(t){
    t.plan(2);

    function getStuff(callback){
        asyncify(function(){
            callback('error');
        });
    }

    var stuff = righto(getStuff);

    var ignoredStuff = righto.mate([stuff]);

    ignoredStuff(function(error){
        t.equal(arguments.length, 1);
        t.equal(error, 'error');
    });
});

test('errors don\'t get gobbled', function(t){
    t.plan(1);

    function getStuff(callback){
        throw "BOOM";
    }

    var stuff = righto(getStuff);

    catchOnce(function (error) {
      t.equal(error, windowError || "BOOM");
    });

    stuff();
});

test('surely errors', function(t){
    t.plan(4);

    var errorOrX = righto.surely(function(done){
        asyncify(function(){
            done(true);
        });
    });

    var errorOrY = righto.surely(function(done){
        asyncify(function(){
            done(null, 'y');
        });
    });

    righto(function([xError, x], [yError, y]){

        t.ok(xError);
        t.notOk(x);
        t.notOk(yError);
        t.ok(y);

    }, errorOrX, errorOrY)();
});

test('surely multiple results', function(t){
    t.plan(6);

    var errorOrX = righto.surely(function(done){
        asyncify(function(){
            done(true);
        });
    });

    var errorOrY = righto.surely(function(done){
        asyncify(function(){
            done(null, 'y1', 'y2', 'y3');
        });
    });

    righto(function([xError, x], [yError, y1, y2, y3]){

        t.ok(xError);
        t.notOk(x);
        t.notOk(yError);
        t.equal(y1, 'y1');
        t.equal(y2, 'y2');
        t.equal(y3, 'y3');

    }, errorOrX, errorOrY)();
});

test('0 results resolve 1 argument as a dep', function(t){
    t.plan(2);

    function getStuff(callback){
        callback();
    }

    var stuff = righto(getStuff);

    var things = righto(function(nothing, callback){
        t.equal(nothing, undefined);
        t.ok(typeof callback === 'function');
    }, stuff);

    things(function(){});
});

test('proxy support', function(t){
    t.plan(1);

    if(typeof Proxy === 'undefined'){
        t.pass('Proxy not available');
        return;
    }

    function getStuff(callback){
        callback(null, {foo: {bar: 'bar'}});
    }

    var stuff = righto.proxy(getStuff);

    stuff.foo.bar(function(error, bar){
        t.equal(bar, 'bar');
    });
});

test('proxy support all', function(t){
    t.plan(1);

    if(typeof Proxy === 'undefined'){
        t.pass('Proxy not available');
        return;
    }

    t.equal(righto.proxy.all, righto.all);
});

test('resolve', function(t){
    t.plan(1);

    var foo = righto(function(callback){
        asyncify(function(){
            callback(null, 'foo');
        });
    });

    var bar = righto.resolve({foo: foo});

    bar(function(error, bar){
        t.deepEqual(bar, {foo: 'foo'});
    });
});

test('resolve deep', function(t){
    t.plan(1);

    var foo = righto(function(callback){
        asyncify(function(){
            callback(null, 'foo');
        });
    });

    var bar = righto.resolve({foo: {bar: foo}}, true);

    bar(function(error, bar){
        t.deepEqual(bar, {foo: {bar: 'foo'}});
    });
});

test('resolve null', function(t){
    t.plan(1);

    var bar = righto.resolve(null);

    bar(function(error, bar){
        t.equal(bar, null);
    });
});

test('promise support', function(t){
    t.plan(1);

    var somePromise = new Promise(function(resolve, reject){
            asyncify(function(){
                resolve('foo');
            });
        });

    var bar = righto(function(someValue, done){
        done(null, someValue);
    }, somePromise);

    bar(function(error, bar){
        t.equal(bar, 'foo');
    });
});

test('fake promise support', function(t){
    t.plan(1);

    var somePromise = {
            then: function(resolve, reject){
                resolve('foo');
            }
        };

    var bar = righto(function(someValue, done){
        done(null, someValue);
    }, somePromise);

    bar(function(error, bar){
        t.equal(bar, 'foo');
    });
});

test('generator support', function(t){
    t.plan(1);

    var generated = righto.iterate(function*(){
        var x = yield righto(function(done){
            asyncify(function(){
                done(null, 'x');
            });
        });

        var y = yield righto(function(done){
            asyncify(function(){
                done(null, 'y');
            });
        });

        return x + y;
    });

    generated(function(error, result){
        t.equal(result, 'xy');
    });
});

test('generator support errors', function(t){
    t.plan(1);

    var generated = righto.iterate(function*(){
        var x = yield righto(function(done){
            asyncify(function(){
                done('error');
            });
        });

        var y = yield righto(function(done){
            asyncify(function(){
                done(null, 'y');
            });
        });

        return x + y;
    });

    generated(function(error, result){
        t.equal(error, 'error');
    });
});

test('generator support errors 2', function(t){
    t.plan(1);

    var generated = righto.iterate(function*(){
        var x = yield righto(function(done){
            asyncify(function(){
                done(null, 'x');
            });
        });

        var y = yield righto(function(done){
            asyncify(function(){
                done('error');
            });
        });

        return x + y;
    });

    generated(function(error, result){
        t.equal(error, 'error');
    });
});

test('generator support with args', function(t){
    t.plan(1);

    var foo = righto(function(callback){
        asyncify(function(){
            callback(null, 'foo');
        });
    });

    var bar = righto(function(callback){
        asyncify(function(){
            callback(null, 'bar');
        });
    });

    function* doThings(foo, bar){
        var x = yield righto(function(done){
            asyncify(function(){
                done(null, foo);
            });
        });

        var y = yield righto(function(done){
            asyncify(function(){
                done(null, bar);
            });
        });

        return x + y;
    }

    var thingsDone = righto.iterate(doThings, foo, bar);

    thingsDone(function(error, result){
        t.equal(result, 'foobar');
    });
});

test('generators that yield promises :/', function(t){
    t.plan(1);

    var generated = righto.iterate(function*(){
        var x = yield righto(function(done){
            asyncify(function(){
                done(null, 'x');
            });
        });

        var y = yield new Promise(function(resolve, reject){
            asyncify(function(){
                resolve('y');
            });
        });

        return x + y;
    });

    generated(function(error, result){
        t.equal(result, 'xy');
    });
});

test('generators with passed errors', function(t){
    t.plan(1);

    var generated = righto.iterate(function*(reject){
        var x = yield righto(function(done){
            asyncify(function(){
                done(null, 'x');
            });
        });

        if(x === 'x'){
            return reject('foo');
        }

        var y = yield righto(function(done){
            asyncify(function(){
                done(null, 'y');
            });
        });

        return x + y;
    });

    generated(function(error, result){
        t.equal(error, 'foo');
    });
});

test('generators with surely errors', function(t){
    t.plan(3);

    var generated = righto.iterate(function*(reject){
        var [xError, x] = yield righto.surely(function(done){
            asyncify(function(){
                done(true);
            });
        });

        t.ok(xError);
        t.notOk(x);

        if(xError){
            return reject('xError');
        }

        var [yError, y] = yield righto.surely(function(done){
            asyncify(function(){
                done(null, 'y');
            });
        });

        return x + y;
    });

    generated(function(error, result){
        t.equal(error, 'xError');
    });
});

test('righto.value', function(t){
    t.plan(2);

    var righto1 = righto(function(done){
            done(null, 5);
        });

    var rightoValue = righto.value(righto1);

    var righto2 = righto(function(value, done){
            t.notEqual(value, 5);

            value(function(error, x){
                t.equal(x, 5);
            });

        }, rightoValue);

    righto2();
});

test('sync', function(t){
    t.plan(3);

    function getStuff(callback){
        t.pass('getStuff called');
        return 3;
    }

    var stuff = righto.sync(getStuff);

    stuff(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 3, 'Got correct result');
    });

});

test('sync errors throw', function(t){
    t.plan(2);

    function getStuff(callback){
        t.pass('getStuff called');
        throw "BORKED";
        return 3;
    }

    var stuff = righto.sync(getStuff);

    catchOnce(function (error) {
      t.equal(error, windowError || "BORKED");
    });

    stuff();

});

test('call tracing', function(t){
    t.plan(1);

    righto._debug = true;

    var a = righto(function(callback){
            asyncify(function(){
                callback(null, 'a');
            });
        });

    var b = righto(function(a, callback){
            asyncify(function(){
                callback(null, 'b');
            });
        }, a);

    var c = righto(function(a, b, callback){
            asyncify(function(){
                callback(null, 'c');
            });
        }, a, b);

    var d = righto(function(b, c, callback){
            asyncify(function(){
                callback(null, 'c');
            });
        }, b, c);

    var trace = d._trace();

    t.equal(trace.split(/\n/g).length, 7);
});

test('error tracing', function(t){
    t.plan(2);

    righto._debug = true;
    righto._autotraceOnError = true;

    var a = righto(function(callback){
            asyncify(function(){
                callback(null, 'a');
            });
        });

    var b = righto(function(a, callback){
            asyncify(function(){
                callback(null, 'b');
            });
        }, a);

    var c = righto(function(a, b, callback){
            asyncify(function(){
                callback('BOOM', 'c');
            });
        }, a, b);

    var d = righto(function(b, c, callback){
            asyncify(function(){
                callback(null, 'c');
            });
        }, b, c);

    consoleWatch(function(getResults){
        d(function(){
            var trace = getResults().log[0];

            t.equal(trace.split(/\n/g).length, 7);
            t.ok(~trace.indexOf('ERROR SOURCE'));
        });
    });
});

test('get returning a righto', function(t){
    t.plan(1);

    function getThingos(callback){
        asyncify(function(){
            callback(null, [1, 2, 3, 4, 5]);
        });
    };

    function doStuff(x, callback){
        asyncify(function(){
            callback(null, x*2);
        });
    }

    var x = righto(getThingos)
        .get(x => x.map(y => righto(doStuff, y)))
        .get(righto.all);

    x(function(error, results){
        t.deepEqual(results, [2, 4, 6, 8, 10]);
    });
});