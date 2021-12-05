const http = require('http');

http.createServer(function (req, res) {
    console.log('received request')
    res.end('8080');
}).listen(8080);

http.createServer(function (req, res) {
    console.log('received request')
    res.end('8081');
}).listen(8081);

console.log(`Start servers`);