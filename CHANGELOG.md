# V6

righto.iterate is now more reasonable, and is more similar to async/await

## Breaking changes

The generator function is no longer passed `reject`, instead, return a rejected righto:

## Old style
```js
var doThing = righto.iterate(function*(reject){
    return reject('some error');
});

doThing(function(error, result){ ... });
```

## New style

```js
var doThing = righto.iterate(function*(){
    return righto.fail('some error');
});

doThing(function(error, result){ ... });
```

Arguments can now be passed into the function returned from righto.iterate

## Old style
```js
var doThing = righto.iterate(function*(param1, param2){
    var result = yield righto(doSomething, param1, param2)

    return result;
}, arg1, arg2);


doThing(function(error, result){ ... });
```

## New style
```js
var doThing = righto.iterate(function*(param1, param2){
    var result = yield righto(doSomething, param1, param2)

    return result;
});

var result = righto(doThing, arg1, arg2);

result(function(error, result){ ... });
```

this makes righto.iterate easier to use outside of a wrapping function, and results in a function that works like every other CPS style function

Also fixed: Returning a resolvable value will now pass the resolved result instead of passing the resolvable through as the result.

# V5

`righto.reduce` is now more reasonable, and will now always treat the first parameter as an array of values/eventuals, rather than assuming they were functions to be called with righto. Migration is trivial:

## Old style:
```javascript
function a(callback){
    callback(null, 1);
}

function b(callback){
    callback(null, 2);
}

// Old style:
var result = righto.reduce([a, b]);
// New style: wrap the tasks as eventuals:
var result = righto.reduce([righto(a), righto(b)]);
```

if you need to pass values to each task, use a custom reducer:


## Old style:
```javascript
function a(lastResult, callback){
    callback(null, lastResult + 1);
}

function b(lastResult, callback){
    callback(null, lastResult + 2);
}

// Old style:
var result = righto.reduce([a, b]);

// New style: a reducer that passes the result into the next function:
var result = righto.reduce([a, b], (result, next) => righto(next, result));
```

# V4
`righto.from` is now more reasonable, and will always either return a righto passed to it, or return a righto that resolves that value passed.
This means it can no longer be used to call promise-returning functions, but that is already available with `righto.sync`

example:

```javascript
function createAPromise(a, b){
    return new Promise( ... );
}

/* OLD */
/* Will no longer work */
var someRighto = righto.from(createAPromise, 1, 2);

/* NEW */
/* Functionally identical to the old version */
var someRighto = righto.sync(createAPromise, 1, 2);

```