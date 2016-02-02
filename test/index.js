var righto = require('../');

function asyncify(fn){
    setTimeout(fn, Math.random() * 1000);
}

// function getStuff(callback){
//     asyncify(function(){
//         callback(null, 3);
//     });
// }

// function getOtherStuff(callback){
//     asyncify(function(){
//         callback(null, 7);
//     });
// }

// function getThingsWithStuff(a, b, callback){
//     asyncify(function(){
//         callback(null, a + b);
//     });
// }

// var stuff = righto(getStuff),
//     otherStuff = righto(getOtherStuff);


// var thingsWithStuff = righto(getThingsWithStuff, stuff, otherStuff);

// thingsWithStuff(function(error, result){
//     console.log(error, result);
// });

// thingsWithStuff(function(error, result){
//     console.log(error, result);
// });

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

getFoo(function(){
    console.log(arguments);
});