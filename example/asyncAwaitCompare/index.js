var getJSON = require('./getJSON');
var addHtmlToPage = require('./addHtmlToPage');
var addTextToPage = require('./addTextToPage');

// Righto version of this: http://jakearchibald.com/2014/es7-async-functions/

var righto = require('../../');

function loadStory(){
    var story = righto(getJSON, 'story.json');

    var headingAdded = story.get(story => addHtmlToPage(story.heading));

    var chaptersAdded = righto.reduce(story.get(story => story.chapterURLs.map(chapterUrl =>
            righto(getJSON, chapterUrl)().get(addHtmlToPage)
        )));

    righto.reduce([headingAdded, chaptersAdded])(error => {
        error ?
            addTextToPage("Argh, broken: " + error.message) :
            addTextToPage('All done');
        document.querySelector('.spinner').style.display = 'none';
    });
}

window.addEventListener('load', loadStory);