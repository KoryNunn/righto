# Righto

An Eventuals implementation that:
 - Lets you use synchronous functions, err-backs (normal callback style), promises, iterators (yield), whatever you like.
 - Are lazily evaluated.
 - Implicitly (and transparently) handles execution order and parallelisation.
 - Provides a solution for all common (and some less common) async flows, parallel, waterfall, series, etc, etc...
 - Doesn't catch thrown errors. [Why is this good?](https://github.com/korynunn/righto-v-promise#errors)

`righto` takes a task to run, and arguments to pass to the task. If you pass any eventual arguments (rightos or promises), they will be resolved before running the dependant task.

**`righto`'d tasks are resolved once** and the result is cached. If a task is in flight when it's results are asked for, the results will be passed when the task resolves.

```javascript
// Make a task from an err-back function
var document = righto(db.Documents.get, documentId);

var user = righto(db.Users.get, userId);

// Resolve an object with eventual properties to pass to a function.
var account = righto(db.Accounts.get, righto.resolve({
        userId: user.get('id')
    }));

// Reject the flow if a business rule is not met
function isOwner(document, account){
    if(document.ownerId !== account.id){
        return righto.fail({ message: 'Account does not own document', code: 403 });
    }
}

// Make a task from a synchronous function
// Depend on `document` and `account` in parallel, automatically.
var hasPermission = righto.sync(isOwner, document, account);

// Take results from a task only after another task is complete
var allowedDocument = righto.mate(document, righto.after(hasPermission));

// Use the results.
allowedDocument(function(eror, document){
    // Respond with the error or the document.
});
```

## Who's using it?

<img src="https://s.yimg.com/ao/i/mp/properties/multipass/img/plus7/channel-logo-seven.png" alt="7Tennis" height="70px"/> Used in the backend of https://7tennis.com.au/, which handled 800k concurrent users for the early 2017 season.

## Usage:

```javascript
var eventual = righto(task, any...);
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

And supports easily integrating back to promises:


```javascript

var someRighto = righto(function(done){
    setTimeout(function(){
        done(null, 'foo');
    });
});

var somePromise = new Promise(righto.fork(someRighto));

somePromise.then(function(result){
    result === 'foo';
});
```

#### Warning:

1. promises execute immediately.
1. promises will catch any errors thrown within their resolver, and turn them into rejections.

Righto can't help you once you pass control back to promises :)

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

Errors bubble up through tasks, so if a dependency errors, the task errors.

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

## Immediately execute

You can force a righto task for run at any time without dealing with the results (or error) by calling
it with no arguments:

```javascript
// Lazily resolve (won't run untill called)
var something = righto(getSomething);

// Force something to start resolving *now*
something();

// later ...

something(function(error, result){
    // handle error or use result.
});

```

Also, since righto tasks return themselves when called, you can do this a little more shorthand, like so:



```javascript
// Immediately force the righto to begin resolving.
var something = righto(getSomething)(); // <= note the call with no arguments.

// later ...

something(function(error, result){
    // handle error or use result.
});

```

## Take / Multiple results

By default, dependent tasks are passed only the first result of a dependency `righto`. eg:

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

But you can pick and choose what results are used from a dependency like so:

```javascript
// foo() and bar() as defined above...

var getBar = righto(bar, righto.take(getFoo, 0, 2)); // Take result 0, and result 2, from getFoo

getBar(function(error, result){
    // ...1 second later...
    result -> 'first third';
});
```

## Reduce

righto.reduce takes N tasks, or an Array of tasks as the first argument,
resolves them from left-to-right, optionally passing the result of the last, and the next task to a reducer.

If no reducer is passed, the tasks will be resolved in series, and the final tasks result will be passed as the result from reduce.

If a reducer is used, a seed can optionally be passed as the third parameter.

If no tasks are passed, the final result will be `undefined`.

No reducer passed:
```javascript
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
    // finalResult === 2
});
```

With a custom reducer, and seed.

```javascript
function a(last, callback){
    aCalled = true;
    t.pass('a called');
    callback(null, last);
}

function b(last, callback){
    t.ok(aCalled, 'b called after a');
    callback(null, last + 2);
}

// Passes previous eventual result to next reducer call.
var result = righto.reduce(
        [a, b],
        function(result, next){ // Reducer
            return righto(next, result);
        },
        5 // Seed
    );

result(function(error, finalResult){
    // finalResult === 7
});
```


## After

Sometimes you need a task to run after another has succeeded, but you don't need its results,
righto.after(task1, task2, taskN...) can be used to achieve this:

```javascript
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

Eventuals can also be returned from inside righto.sync, which will be resolved within the flow.

## From

Anything can be converted to a righto with righto.from(anything);

```javascript
righto.from(someRighto); // Returns someRighto
righto.from(somePromise); // Returns a new righto that resolves the promise
righto.from(5); // Returns a new righto that resolves 5
righto.from(createARighto, args...); // Calls createARighto with args..., and then returns a new righto that resolves the result
righto.from(createAPromise, args...); // Calls createAPromise with args..., and then returns a new righto that resolves the result
```

## Value (passing resolvables as unresolved arguments)

Sometimes it may be required to pass a resolvable (a righto, or promise) without as an argument,
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

## Get

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

## Surely (resolve [error?, results...?])

You can resolve a task to an array containing either
the error or results from a righto with `righto.surely`

```javascript

var errorOrX = righto.surely(function(done){
        done(new Error('borked'));
    });

var errorOrY = righto.surely(function(done){
        done(null, 'y');
    });

var z = righto(function([xError, x], [yError, y]){

        xError; // -> Error 'borked'
        x; // -> undefined
        yError; // -> null
        y; // -> 'y'

    }, errorOrX, errorOrY);

z();

```

## Handle

Wrap a righto task with a handler that either forwards the successful result, or
sends the rejected error through a handler to resolve the task.

```javascript
function mightFail(callback){
    if(Math.random() > 0.5){
        callback('borked');
    }else{
        callback(null, 'result');
    }
};

function defaultString(error, callback){
    callback(null, '');
}

var maybeAString = righto(mightFail),
    aString = righto.handle(maybeAString, defaultString);

aString(function(error, result){
    typeof result === 'string';
});
```

This can also be used to pass custom error results:

```javascript
function nullOnNoent(error, callback){
    if(error.code === 'ENOENT'){
        return callback();
    }

    return callback(error);
}

var aFile = righto(fs.readFile, 'someFilePath.txt', 'utf8'),
    aFileOrNull = righto.handle(aFile, nullOnNoent);

aFile(function(error, result){
    // If the file isnt found, error && result will be null
});
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

## Fail

A shorthand way to provide a failed result.

This is handy for rejecting in .get methods.

```javascript
var something = someRighto.get(function(value){
        if(!value){
            return righto.fail('was falsey');
        }

        return value;
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

## isRighto, isThenable, isResolvable

Use these methods to check if something is a righto, a thenable, or resolvable (either righto or thenable);

```javascript

var rigthoA = righto(function(done){
    done(null, 1);
});

var promiseB = new Promise(function(resolve, reject){
    resolve(null, 2);
});

righto.isRighto(rigthoA); -> true
righto.isRighto(promiseB); -> false
righto.isThenable(rigthoA); -> false
righto.isThenable(promiseB); -> true
righto.isResolvable(rigthoA); -> true
righto.isResolvable(promiseB); -> true

```

# Tracing

You can get a trace of where a righto went to resolve its dependencies by setting:

```javascript
righto._debug = true;
```

which will tell any **following** calls to `righto` to store a stack trace against it.

You can then retrieve the trace with:

```javascript
var x = righto(something, ...);

x._trace(); ->
```

```
something (.../index.js:1034:13)
    - argument "b" from taskB (.../index.js:1022:13)
        - argument "a" from taskA (.../index.js:1016:13)
    - argument "c" from taskC (.../index.js:1028:13)
        - argument "a" from taskA (.../index.js:1016:13)
        - argument "b" from taskB (.../index.js:1022:13)
            - argument "a" from taskA (.../index.js:1016:13)

```

You can also tell righto to print a graph trace, highlighting the offending task, when a graph rejects.

Either per-righto:

```javascript
var task = righto(fn, dep, dep, dep...);

task._traceOnError = true;

task();
// Logs...
```

Or globally:

```javascript
righto._autotraceOnError = true;
```

Which print handy traces like this one:

![righto graph trace](https://korynunn.files.wordpress.com/2016/09/debug.png?w=680)

## NOTE:

Only rightos that were instantiated **after** setting the debug flag will support tracing.


## Unsupported from v1.

The take/ignore syntax that used a single righto within an array has been deprecated
due to it having been a bad idea that I should never have implemented to begin with.

This syntax was deprecated a few v1 versions ago, so you can get a console.warn for potential usages
of the syntax by turning on _debug mode and _warnOnUnsupported:

```javascript
righto._debug = true;
righto._warnOnUnsupported = true;

// ... code ...

var getFoo = righto(foo, [getBar]); // <- the unsupported syntax

getFoo( ... ); // -> console.warn()'s the line number where it was used.

```
