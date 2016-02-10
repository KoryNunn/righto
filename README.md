# Righto

Wana do some async stuff? Righto..

# What

make caching, dependency resolving tasks

# ...What?

`righto` takes a task to run, and arguments to pass to the task. If you pass a `righto`'d task as an argument, it will be resolved before running the dependant task.

```javascript
righto(task, [argument or righto task])
```

**`righto`'d tasks are resolved once** and the result is cached. If a task is in flight when it's results are asked for, the results will be passed when the task resolves.

## examples:

sync dependencies passed to bar (Not very useful):

```javascript
function bar(a, callback){
    callback(null, 'hello ' + a);
}

var getBar = righto(bar, 'world');

getBar(function(error, result){
    result -> 'hello world';
});
```

async dependencies passed to bar:

```javascript
function foo(callback){
    setTimeout(function(){

        callback(null, 'world');

    }, 1000);
}

var getFoo = righto(foo);

function bar(a, callback){
    callback(null, 'hello ' + a);
}

var getBar = righto(bar, getFoo);

getBar(function(error, result){
    // ...1 second later...
    result -> 'hello world';
});
```

## Multiple results

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

var getBar = righto(bar, [getFoo, 0, 2]); // Take result 0, and result 2, from getFoo

getBar(function(error, result){
    // ...1 second later...
    result -> 'first third';
});
```

## Subkeys

You can create a new `righto` that resolves the key on a result like so:

```
var user = righto(getUser);

var userName = user.get('name');

userName(function(error, name){
    // error or userName.
});

```

And keys can be `righto`'s as well:

```
var user = righto(getUser);
var userKey = righto(getKey);

var userName = user.get(userKey);

userName(function(error, something){
    // error or something.
});

```