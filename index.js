var foreign = require('foreign'),
    cpsenize = require('cpsenize');

function isRighto(x){
    return typeof x === 'function' && x.resolve === x;
}

function slice(list, start, end){
    return Array.prototype.slice.call(list, start, end);
}

function resolveDependency(task, done){
    if(isRighto(task)){
        return task(function(error){
            done(error, slice(arguments, 1, 2));
        });
    }

    if(Array.isArray(task) && isRighto(task[0])  && !isRighto(task[1])){
        return task[0](function(error){
            var args = slice(arguments, 1);
            done(error, task.slice(1).map(function(key){
                return args[key];
            }));
        });
    }

    return done(null, [task]);
}

function get(key){
    return righto(function(result, key, done){
        done(null, result[key]);
    }, this, key);
}

function righto(fn){
    var args = slice(arguments, 1),
        context = this,
        started = 0,
        callbacks = [],
        results;

    function resolve(callback){
        if(results){
            return callback.apply(context, results);
        }

        callbacks.push(callback);

        if(started++){
            return;
        }

        function resolveWithDependencies(error, argResults){
            if(error){
                return callbacks.forEach(function(callback){
                    callback(error);
                });
            }

            argResults = [].concat.apply([], argResults);

            argResults.push(function(){
                results = arguments;
                callbacks.forEach(function(callback){
                    callback.apply(context, results);
                });
            });

            fn.apply(null, argResults);
        }

        foreign.parallel(resolveDependency, args, resolveWithDependencies);
    };

    resolve.get = get.bind(resolve);
    resolve.resolve = resolve;

    return resolve;
}

righto.sync = function(fn){
    return righto.apply(null, [cpsenize(fn)].concat(slice(arguments, 1)));
};

righto.all = function(task){
    if(arguments.length > 1){
        task = slice(arguments);
    }

    function resolve(tasks){
        return righto.apply(null, [function(){
            arguments[arguments.length - 1](null, slice(arguments, 0, -1));
        }].concat(tasks));
    }

    if(isRighto(task)){
        return righto(function(tasks, done){
            resolve(tasks)(done);
        }, task);
    }

    return resolve(task);
};

module.exports = righto;