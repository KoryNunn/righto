var files = {
    'story.json': {
        heading: '<h1>Heading</h1>',
        chapterURLs:[
            '1.txt',
            '2.txt',
            '3.txt'
        ]
    },
    '1.txt': '<p>Foo</p>',
    '2.txt': '<p>Bar</p>',
    '3.txt': '<p>Baz</p>'
};

module.exports = function(url, callback){
    setTimeout(function(){
        if(Math.random() * 10 < 1){
            return callback(new Error('Load failed - ' + url));
        }
        callback(null, files[url]);
    }, Math.random() * 500 + 500);
}