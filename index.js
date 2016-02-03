var foreign = require('foreign'),
    cpsenize = require('cpsenize');

function isRighto(x){
    return typeof x === 'function' && x.get === x;
}

function righto(fn){
    var args = Array.prototype.slice.call(arguments, 1),
        context = this,
        started = 0,
        callbacks = [],
        results;

    function get(callback){
        if(results){
            return callback.apply(context, results);
        }

        callbacks.push(callback);

        if(started++){
            return;
        }


        foreign.parallel(function(task, done){
            if(isRighto(task)){
                return task(function(error){
                    done(error, Array.prototype.slice.call(arguments, 1));
                });
            }

            if(Array.isArray(task) && isRighto(task[0])  && !isRighto(task[1])){
                return task[0](function(error){
                    var args = Array.prototype.slice.call(arguments, 1);
                    done(error, task.slice(1).map(function(key){
                        return args[key];
                    }));
                });
            }

            return done(null, task);
        }, args, function(error, argResults){
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
        });
    };

    get.get = get;

    return get;
}

righto.sync = function(fn){
    return righto.apply(null, [cpsenize(fn)].concat(Array.prototype.slice.call(arguments, 1)));
};

righto.all = function(task){
    function resolve(tasks){
        return righto.apply(null, [function(){
            arguments[arguments.length - 1](null, Array.prototype.slice.call(arguments, 0, -1));
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