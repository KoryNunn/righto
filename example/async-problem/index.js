var fs = require('fs');
var path = require('path');
var righto = require('righto');

function main(){
    var dir = process.argv[2],
        readDirFile = file => righto(fs.readFile, path.join(dir, file), {encoding:'utf8'});

    var file = readDirFile('index.txt'),
        files = righto.sync(index => index.match(/^.*(?=\n)/gm).map(readDirFile), file),
        concatedFiles = righto.sync(results => results.join(''), righto.all(files));

    concatedFiles((error, data) => {
        if(error){
            process.stderr.write(String(error) + '\n');
            process.exit(1);
        }else{
            process.stdout.write(data);
            process.exit(0);
        }
    });
}

main();