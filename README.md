# Righto

Wana do some async stuff? Righto..

# What

make caching, dependency resolving tasks

# ...What?

No time to explain..

TODO: Make readme better.

```
function foo(callback){
    callback(null, 2);
}

function bar(a, callback){
    callback(null, 'hello ' + a);
}

var getFoo = righto(foo);

var getBar = righto(bar, [getFoo]);

getBar(function(error, result){
    result -> 'hello 2';
});
```