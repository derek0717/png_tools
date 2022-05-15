const fs = require('fs')
const path = require('path');
const outputPath = './_test';

let text = JSON.parse(fs.readFileSync(path.join(outputPath,'productinfo.meta')));
console.log(text.title.en);
console.log(text.author.en);