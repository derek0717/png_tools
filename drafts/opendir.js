let path = require("path");
let absolutePath = path.resolve("./_test");
console.log(absolutePath);
require('child_process').exec('open "'+absolutePath+'"');