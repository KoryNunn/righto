var test = require('tape'),
    righto = require('../');

function asyncify(fn){
    setTimeout(fn, Math.random() * 10);
}

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

    var didThing,
        doThing = righto(function(done){
            didThing = true;
            done();
        });

    doThing();

    t.equal(didThing, true, 'Task ran correctly');
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

test('errors don\'t get gobbled', function(t){
    t.plan(1);

    function getStuff(callback){
        throw "BOOM";
    }

    var stuff = righto(getStuff);

    t.throws(function(){
        stuff();
    });
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