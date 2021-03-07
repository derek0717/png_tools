const fs = require('fs')
const https = require('https')

let linePackId = process.argv[2];
if(!linePackId) {console.log('no Line sticker pack ID'); return;}
var inputPath = "inputFolder/";
var outputPath = "outputFolder/";
const linePackPath = "https://stickershop.line-scdn.net/stickershop/v1/product/"+linePackId+"/iphone/stickerpack@2x.zip";

const zipFile = fs.createWriteStream("downloadFolder/stickerpack@2x.zip");

https.get(linePackPath, function(response) {
    response.pipe(zipFile);
    console.log('downloaded');
});