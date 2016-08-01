# Righto

Wana do some async stuff? Righto..

# What

make caching, dependency resolving tasks

`righto` takes a task to run, and arguments to pass to the task. If you pass a `righto`'d task as an argument, it will be resolved before running the dependant task.

```javascript
righto(task, [argument or righto task])
```

**`righto`'d tasks are resolved once** and the result is cached. If a task is in flight when it's results are asked for, the results will be passed when the task resolves.

## example:

async dependencies passed to bar:

```javascript

// Just your average callback-passing-style function.
function foo(callback){

    setTimeout(function(){

        callback(null, 'world');

    }, 1000);

}

// A righto callback-passing-style function
var getFoo = righto(foo);

// Another normal callback-passing-style function.
function bar(a, callback){
    callback(null, 'hello ' + a);
}

// Another righto
var getBar = righto(bar, getFoo);

getBar(function(error, result){

    // ...about 1 second later...
    result -> 'hello world';

});
```

## API support

### Callbacks

righto suports passing error-first CPS functions by default as tasks:

```javascript
function foo(callback){
    setTimeout(function(){
        callback(null, 'foo');
    });
}

var eventuallyFoo = righto(getFoo);

eventuallyFoo(function(error, result){
    result === 'foo';
});
```

### Promise

righto supports passing Promises as a dependency:

```javascript
var somePromise = new Promise(function(resolve, reject){
    setTimeout(function(){
        resolve('foo');
    });
});

var someRighto = righto(function(somePromiseResult, done){
    done(null, somePromiseResult);
}, somePromise);

someRighto(function(error, result){
    result === 'foo';
});
```

### Generators (yield)

righto supports running a generator (or any `next`able iterator):

```javascript
var generated = righto.iterate(function*(){
    var x = yield righto(function(done){
        setTimeout(function(){
            done(null, 'x');
        });
    });

    var y = yield righto(function(done){
        setTimeout(function(){
            done(null, 'y');
        });
    });

    return x + y;
});

generated(function(error, result){
    result === 'xy';
});
```

## Errors

Errors bubble up through tasks, so if a dependancy errors, the task errors.

```javascript

// Task that errors
function foo(callback){

    setTimeout(function(){

        callback(new Error('IT BORKED!'));

    }, 1000);

}

var getFoo = righto(foo);

function bar(a, callback){
    callback(null, 'hello ' + a);
}

var getBar = righto(bar, getFoo);

getBar(function(error, result){

    // ...about 1 second later...
    error -> IT BORKED!;

});
```

## Take / Multiple results

By default, dependant tasks are passed only the first result of a dependency `righto`. eg:

```javascript
function foo(callback){
    setTimeout(function(){

        callback(null, 'first', 'second', 'third');

    }, 1000);
}

var getFoo = righto(foo);

function bar(a, callback){
    callback(null, a);
}

var getBar = righto(bar, getFoo);

getBar(function(error, result){
    // ...1 second later...
    result -> 'first';
});
```

But you can pick and choose what results are used from a dependancy like so:

```javascript
function foo(callback){
    setTimeout(function(){

        callback(null, 'first', 'second', 'third');

    }, 1000);
}

var getFoo = righto(foo);

function bar(a, b callback){
    callback(null, [a, b].join(' '));
}

var getBar = righto(bar, righto.take(getFoo, 0, 2)); // Take result 0, and result 2, from getFoo

getBar(function(error, result){
    // ...1 second later...
    result -> 'first third';
});
```

## After

Sometimes you need a task to run after another has succeeded, but you don't need its results,
righto.after(task) can be used to achieve this:

```
function foo(callback){
    setTimeout(function(){

        callback(null, 'first result');

    }, 1000);
}

var getFoo = righto(foo);

function bar(callback){
    callback(null, 'second result');
}

var getBar = righto(bar, righto.after(getFoo)); // wait for foo before running bar.

getBar(function(error, result){
    result -> 'second result';
});
```

## All

righto.all takes N tasks, or an Array of tasks as the first argument, resolves them all
in parallel, and results in an Array of results.

```javascript

var task1 = righto(function(done){
    setTimeout(function(){
        done(null, 'a');
    }, 1000);
});

var task2 = righto(function(done){
    setTimeout(function(){
        done(null, 'b');
    }, 1000);
});

var task3 = righto(function(done){
    setTimeout(function(){
        done(null, 'c');
    }, 1000);
});

var all = righto.all([task1, task2, task3]);

all(function(error, results){
    results; // -> ['a','b','c']
});

```
## Sync

Synchronous functions can be used to create righto tasks using righto.sync:

```javascript

var someNumber = righto(function(done){
    setTimeout(function(){
        done(null, 5);
    }, 1000);
}

function addFive(value){
    return value + 5;
}

var syncTask = righto.sync(addFive, someNumber);

syncTask(function(error, result){
    result; // -> 10
});

```

## Value (passing resolveables as unresolved arguments)

Sometimes it may be required to pass a resolveable (a righto, or promise) without as an argument,
rather than passing the resolved value of the resolvable. you can do this using `righto.value(resolvable)`

```javascript
var righto1 = righto(function(done){
        done(null, 5);
    });

var rightoValue = righto.value(righto1);

var righto2 = righto(function(value, done){
        // value === righto1

        value(function(error, x){
            // x === 5;
        });

    }, rightoValue);

righto2();
```

## Subkeys

You can create a new `righto` that resolves the key/runs a function on a result like so:

```javascript
var user = righto(getUser);

var userName = user.get('name');
// OR: Use a function
var userName = user.get(user => user.name);

userName(function(error, name){
    // error or userName.
});

```

And keys can be `righto`'s as well:

```javascript
var user = righto(getUser);
var userKey = righto(getKey);

var userName = user.get(userKey);

userName(function(error, something){
    // error or something.
});

```

## Possible rightos: righto.from(anything)

Any value can be turned into a righto using righto.from();

```javascript
var num = righto.from(1); // -> righto:number;
var string = righto.from('hello'); // -> righto:string;
var nothing = righto.from(null); // -> righto:null;
var anyValue = righto.from(anything); // -> righto:anything;

var self = righto.from(someRighto); // -> someRighto;
```

## Resolve

Resolves an object to a new object where any righto values are resolved:

```javascript
var foo = righto(function(callback){
    asyncify(function(){
        callback(null, 'foo');
    });
});

//                            recursively resolve child objects
//                                            V
var bar = righto.resolve({foo: {bar: foo}}, true);

bar(function(error, bar){
    bar; // -> {foo: {bar: 'foo'}}
});
```

## All

You may want to run several tasks in parallel.

For this, you can use righto.all.

```javascript
function getStuff(callback){
    // eventually...
    callback(null, 3);
}
var stuff = righto(getStuff);

function getOtherStuff(callback){
    // eventually...
    callback(null, 7);
}
var otherStuff = righto(getOtherStuff);

var stuffInParallelWithOtherStuff = righto.all([stuff, otherStuff]);

stuffInParallelWithOtherStuff(function(err, result){
    result -> [3, 7]
});
```

## Mate

Occasionally you might want to mate a number of tasks into one task.

For this, you can use righto.mate.

```javascript
function getStuff(callback){

    // eventually...
    callback(null, 3);
}

var stuff = righto(getStuff);

function getOtherStuff(callback){

    // eventually...
    callback(null, 7);
}

var otherStuff = righto(getOtherStuff);

var stuffAndOtherStuff = righto.mate(stuff, otherStuff);

stuffAndOtherStuff(function(error, stuff, otherStuff){
    error -> null
    stuff -> 3
    otherStuff -> 7
});
```

## Proxy support

If you are using righto in an environment that supports proxies, you can use the proxy API:

```javascript
var righto = require('righto').proxy;

var foo = righto(function(done){
    setTimeout(function(){
        done(null, {foo: 'bar'});
    });
});

foo.bar(function(error, bar){
    bar === 'bar'
});
```

The proxied api always returns the proxied version, meaning you can dot-access arbitrarily:


```javascript
var righto = require('righto').proxy;

var foo = righto(function(done){
    setTimeout(function(){
        done(null, {
            foo: {
                bar: {
                    baz: 'hello'
                }
            }
        });
    });
});

foo.bar.baz(function(error, baz){
    baz === 'hello'
});
```
