var getJSON = require('./getJSON');
var addHtmlToPage = require('./addHtmlToPage');
var addTextToPage = require('./addTextToPage');

// Righto version of this: http://jakearchibald.com/2014/es7-async-functions/

var righto = require('../');

function loadStory(){
    var getStory = righto(getJSON, 'story.json'),
        addHeading = righto.sync(story => addHtmlToPage(story.heading), getStory),
        addChapters = righto.all(righto.sync(story =>
            story.chapterURLs.map(chapterUrl => righto(getJSON, chapterUrl))
            .reduce((result, getChapter) => righto.sync(addHtmlToPage, getChapter, [result]), null)
        , getStory));

    righto.all(addHeading, addChapters)(error => {
        document.querySelector('.spinner').style.display = 'none';
        error ? addTextToPage("Argh, broken: " + error.message) : addTextToPage('All done');
    });
}

window.addEventListener('load', loadStory);