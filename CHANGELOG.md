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