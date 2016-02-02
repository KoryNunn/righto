var foreign = require('foreign');

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
            if(typeof task === 'function' || task === task.get){
                return task(function(error){
                    done(error, Array.prototype.slice.call(arguments, 1));
                });
            }

            if(Array.isArray(task) && typeof task[0] === 'function' && task[0] === task[0].get){
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

module.exports = righto;