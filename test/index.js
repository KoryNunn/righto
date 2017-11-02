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

test('unsupported ignored deps', function(t){
    t.plan(2);

    function bar(callback){
        callback(null, 1);
    }

    function foo(incorrectValue, callback){
            callback();
    }

    righto._debug = true;
    righto._warnOnUnsupported = true;

    var getBar = righto(bar);

    var getFoo = righto(foo, [getBar]);

    consoleWatch(function(getResults){
        getFoo(function(error, result){

            var trace = getResults().warn[0];

            t.equal(trace.split(/\n/g).length, 2);
            t.ok(~trace.indexOf('Possible unsupported take/ignore syntax detected'));

            righto._debug = false;
            righto._warnOnUnsupported = false;
        });
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

test('Non resolvable passed to take', function(t){
    t.plan(1);

    t.throws(function(){
        righto.take(null, 1);
    }, 'task was not a resolvable value');
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

test('Non resolvable passed to after', function(t){
    t.plan(1);

    t.throws(function(){
        righto.after(null);
    }, 'task was not a resolvable value');
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

test('righto.reduce', function(t){
    t.plan(4);

    var aCalled;

    function a(callback){
        aCalled = true;
        t.pass('a called');
        callback(null, 1);
    }

    function b(callback){
        t.ok(aCalled, 'b called after a');
        callback(null, 2);
    }

    var result = righto.reduce([a, b]);

    result(function(error, finalResult){
        t.notOk(error, 'no error');
        t.equal(finalResult, 2, 'Got correct final result');
    });
});

test('righto.reduce eventuals', function(t){
    t.plan(4);

    var aCalled;

    var a = righto(function(callback){
        aCalled = true;
        t.pass('a called');
        callback(null, 1);
    });

    var b = righto(function(callback){
        t.ok(aCalled, 'b called after a');
        callback(null, 2);
    });

    var result = righto.reduce([a, b]);

    result(function(error, finalResult){
        t.notOk(error, 'no error');
        t.equal(finalResult, 2, 'Got correct final result');
    });
});

test('righto.reduce custom reducer', function(t){
    t.plan(4);

    var aCalled;

    function a(last, callback){
        aCalled = true;
        t.pass('a called');
        callback(null, last);
    }

    function b(last, callback){
        t.ok(aCalled, 'b called after a');
        callback(null, last + 2);
    }

    var result = righto.reduce([a, b], function(result, next){
        return righto(next, result);
    }, 5);

    result(function(error, finalResult){
        t.notOk(error, 'no error');
        t.deepEqual(finalResult, 7, 'Got correct final result');
    });
});

test('righto.reduce with values custom reducer', function(t){
    t.plan(2);

    var result = righto.reduce([1, 2, 3], function(result, next){
        return righto.sync((a) => a + next, result);
    }, 5);

    result(function(error, finalResult){
        t.notOk(error, 'no error');
        t.deepEqual(finalResult, 11, 'Got correct final result');
    });
});

test('righto.reduce no items', function(t){
    t.plan(2);

    var result = righto.reduce([]);

    result(function(error, finalResult){
        t.notOk(error, 'no error');
        t.equal(finalResult, undefined, 'Got correct final result');
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

    var stuffAfterOtherStuff = righto.mate(stuff, righto.after(otherStuff));

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

    var ignoredStuff = righto.mate(righto.after(stuff));

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

    var ignoredStuff = righto.mate(righto.after(stuff));

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

test('proxy dep', function(t){
    t.plan(1);

    if(typeof Proxy === 'undefined'){
        t.pass('Proxy not available');
        return;
    }

    function getStuff(callback){
        callback(null, {foo: 'foo'});
    }

    var stuff = righto.proxy(getStuff);

    var foo = stuff.foo;

    var bar = righto(function(foo, done){
            done(null, foo)
        }, foo);

    bar(function(error, bar){
        t.equal(bar, 'foo');
    });
});

test('proxy resolve', function(t){
    t.plan(1);

    if(typeof Proxy === 'undefined'){
        t.pass('Proxy not available');
        return;
    }

    function getStuff(callback){
        callback(null, {foo: 'foo'});
    }

    var stuff = righto.proxy(getStuff);

    var foo = stuff.foo;

    var bar = righto.resolve({ foo });

    bar(function(error, bar){
        t.deepEqual(bar, { foo: 'foo' });
    });
});

test('proxy resolve deep', function(t){
    t.plan(1);

    if(typeof Proxy === 'undefined'){
        t.pass('Proxy not available');
        return;
    }

    function getStuff(callback){
        callback(null, {foo: 'foo'});
    }

    var stuff = righto.proxy(getStuff);

    var foo = stuff.foo;

    var bar = righto.resolve({ foo }, true);

    bar(function(error, bar){
        t.deepEqual(bar, { foo: 'foo' });
    });
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

test('resolve array', function(t){
    t.plan(2);

    var foo = righto(function(callback){
        asyncify(function(){
            callback(null, 'foo');
        });
    });

    var bar = righto.resolve([foo]);

    bar(function(error, bar){
        t.ok(Array.isArray(bar));
        t.equal(bar[0], 'foo');
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

test('promise resolution support', function(t){
    t.plan(1);

    var someRighto = righto.from(1);

    var somePromise = new Promise(righto.fork(someRighto));

    somePromise.then(function(result, error){
        t.equal(result, 1);
    })
    .catch(function(){
        t.fail();
    });
});

test('promise resolution support error', function(t){
    t.plan(1);

    var someRighto = righto.fail('borked');

    var somePromise = new Promise(righto.fork(someRighto));

    somePromise.then(function(result){
        t.fail();
    })
    .catch(function(error){
        t.equal(error, 'borked');
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

test('sync return eventual', function(t){
    t.plan(2);

    var stuff = righto.sync(function(){
        return righto(function(done){
            asyncify(function(){
                done(null, 3);
            });
        });
    });

    stuff(function(error, result){
        t.notOk(error, 'no error');
        t.equal(result, 3, 'Got correct result');
    });

});

test('sync return erroring eventual', function(t){
    t.plan(1);

    var stuff = righto.sync(function(){
        return righto(function(done){
            asyncify(function(){
                done(true);
            });
        });
    });

    stuff(function(error, result){
        t.ok(error, 'got error');
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

            righto._debug = false;
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

test('handle', function(t){
    t.plan(1);

    function doX(callback){
        asyncify(function(){
            callback('borked');
        });
    };

    function doY(x, callback){
        asyncify(function(){
            callback(null, x*2);
        });
    }

    function defaultZero(error, done){
        done(null, 0);
    }

    var x = righto(doX),
        handledX = righto.handle(x, defaultZero),
        y = righto(doY, handledX);

    y(function(error, result){
        t.equal(result, 0);
    });
});

test('generators with handle success', function(t){
    t.plan(2);

    function eventuallyX(done){
        asyncify(function(){
            done(null, 5);
        });
    }

    function handleXErrors(error, done){
        done('Usefull error');
    }

    var generated = righto.iterate(function*(reject){

        var x = yield righto.handle(righto(eventuallyX), handleXErrors);

        return x;
    });

    generated(function(error, result){
        t.notOk(error);
        t.equal(result, 5);
    });
});

test('generators with handle error', function(t){
    t.plan(2);

    function eventuallyX(done){
        asyncify(function(){
            done('Useless error');
        });
    }

    function handleXErrors(error, done){
        done('Usefull error');
    }

    var generated = righto.iterate(function*(reject){

        var x = yield righto.handle(righto(eventuallyX), handleXErrors);

        return x;
    });

    generated(function(error, result){
        t.notOk(result);
        t.equal(error, 'Usefull error');
    });
});

test('get returning an array of exactly 1 righto', function(t){
    t.plan(2);

    var stuff = righto(function(done){
            asyncify(function(){
                done(null, [{
                    name: 'foo'
                }]);
            });
        });

    function transformItem(item, callback){
        item.name = item.name + 'bar';

        callback(null, item);
    }

    var things = righto.all(stuff.get(items => items.map(item => righto(transformItem, item))));

    things(function(error, results){
        t.notOk(error);
        t.deepEqual(results, [{
            name: 'foobar'
        }]);
    });
});

test('from tasks that return eventuals', function(t){
    t.plan(2);

    function makeRighto(a){
        return righto(function(done){
            done(null, a);
        });
    }

    function makePromise(a){
        return new Promise(function(resolve){
            resolve(a);
        });
    }

    var x = righto.from(makeRighto, 5),
        y = righto.from(makePromise, 10);

    righto.mate(x, y)(function(error, x, y){
        t.equal(x, 5);
        t.equal(y, 10);
    });
});

test('from tasks with eventual args', function(t){
    t.plan(1);

    var x = righto(function(done){
        done(null, 'x');
    });

    function makeRighto(a){
        return righto(function(done){
            done(null, a);
        });
    }

    var result = righto.from(makeRighto, x);

    result(function(error, x){
        t.equal(x, 'x');
    });
});

test('from promise lazy executes', function(t){
    t.plan(2);

    var ran;

    function makePromise(){
        return new Promise(function(resolve){
            ran = true;
            resolve();
        });
    }

    var result = righto.from(makePromise);

    t.notOk(ran, 'Promise has not run by now');

    result(function(){
        t.ok(ran, 'Promise has run by now');
    });

});

test('isRighto', function(t){
    t.plan(9);

    var rigthoA = righto(function(done){
        done(null, 1);
    });
    var promiseB = new Promise(function(resolve, reject){
        resolve(null, 2);
    });

    t.ok(righto.isRighto(rigthoA), 'rigthoA is righto');
    t.notOk(righto.isRighto(promiseB), 'promiseB is not a righto');
    t.notOk(righto.isThenable(rigthoA), 'rigthoA is not a thenable');
    t.ok(righto.isThenable(promiseB), 'promiseB is thenable');
    t.ok(righto.isResolvable(rigthoA), 'rigthoA is resolvable');
    t.ok(righto.isResolvable(promiseB), 'promiseB is resolvable');

    t.notOk(righto.isRighto(null), 'null is not a righto');
    t.notOk(righto.isThenable(null), 'null is not a thenable');
    t.notOk(righto.isResolvable(null), 'null is not a resolvable');
});

test('righto.fail', function(t){
    t.plan(1);

    var falure = righto.fail('reasons');

    falure(function(error){
        t.equal(error, 'reasons');
    });
});

test('righto.fail resolvable', function(t){
    t.plan(1);

    var eventualFailData = righto(function(done){
        setTimeout(function(){
            done(null, 'reasons'); // Return the error in the result, not the rejection.
        }, 100);
    });

    var falure = righto.fail(eventualFailData);

    falure(function(error){
        t.equal(error, 'reasons');
    });
});

test('righto prerun return', function(t){
    t.plan(2);


    var start = Date.now();
    var lazyRun = righto(function(done){
            setTimeout(done, 100, null, true);
        }),
        eagerRun = righto(function(done){
            setTimeout(done, 100, null, true);
        })(); // call immediately so that it eagerly runs.

    setTimeout(function(){
        lazyRun(function(){
            t.ok(Date.now() - start >= 145, 'Result completed in at least 150ms');
        });
        eagerRun(function(){
            t.ok(Date.now() - start < 125, 'Result completed in significantly less than 150ms');
        });
    }, 50);
});

test('enourmous handle stack depth success', function(t){
    t.plan(1);

    var depth = 0;
    var testDepth = 10000;

    function run(callback){
        var thingo = righto.handle(righto(function(done){
            if(depth++ < testDepth){
                return done('error');
            }

            done(null, 'complete');
        }), function(error, done){
            if(error){
                return run(done);
            }

            done();
        });

        thingo(callback);
    }

    run(function(error, result){
        t.equal(result, 'complete', 'Success after enourmous handle depth');
    })
});

test('enourmous handle stack depth reject', function(t){
    t.plan(1);

    var depth = 0;
    var testDepth = 10000;

    function run(callback){
        var thingo = righto.handle(righto(function(done){
            if(depth++ < testDepth){
                return done('retry');
            }

            done('fail');
        }), function(error, done){
            if(error === 'retry'){
                return run(done);
            }

            done(error);
        });

        thingo(callback);
    }

    run(function(error, result){
        t.equal(error, 'fail', 'Rejection after enourmous handle depth');
    })
});

test('enourmous stack depth already done', function(t){
    t.plan(1);

    var depth = 0;
    var testDepth = 10000;

    var x = righto.from(1);

    while(depth++ < testDepth){
        x = righto.sync(x => x, x);
    }

    x(function(error, result){
        t.equal(result, 1, 'Success after enourmous handle depth');
    });
});