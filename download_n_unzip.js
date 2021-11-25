const fs = require('fs')
const https = require('https')
const AdmZip = require('adm-zip');

let linePackId = process.argv[2];
if(!linePackId) {console.log('no Line sticker pack ID'); return;}

var currentPathString = ".";
var downloadPath = currentPathString+"/temp";
var unzippedPath = currentPathString+"/unzipped";
var zipFilePath = downloadPath+"/stickerpack.zip";
var staticZipFilePath = downloadPath+"/sticker.zip";
var unzipPath = unzippedPath+"/stickerpack";
var staticUnzipPath = unzippedPath+"/sticker";

const linePackPath = "https://stickershop.line-scdn.net/stickershop/v1/product/"+linePackId+"/iphone/stickerpack@2x.zip";
const lineStaticPackPath = "https://stickershop.line-scdn.net/stickershop/v1/product/"+linePackId+"/iphone/stickers@2x.zip";

// init folders
[ downloadPath,unzippedPath ].forEach(function(path){
    if (fs.existsSync(path)){
        fs.rmdir(path, { recursive: true },function(){
            fs.mkdirSync(path);
        });
    } else {
        fs.mkdirSync(path);
    }
});

https.get(linePackPath, function(response) {
    response.pipe(fs.createWriteStream(zipFilePath)).on('close', function(){
        console.log('downloaded');
        var fileSizeInBytes = (fs.statSync(zipFilePath)).size
        console.log(fileSizeInBytes+'B');
        if(fileSizeInBytes<11111){
            // static
            console.log('Animation package not found, downloading static package')
            fs.unlinkSync(zipFilePath)
            https.get(lineStaticPackPath, function(response) {
                response.pipe(fs.createWriteStream(staticZipFilePath)).on('close', function () {
                    console.log('downloaded');
                    const admZipFile = new AdmZip(staticZipFilePath);
                    admZipFile.extractAllTo(staticUnzipPath, true);
                    console.log('unzipped')
                })
            });
        } else {
            // animation
            const admZipFile = new AdmZip(zipFilePath);
            admZipFile.extractAllTo(unzipPath, true);
            console.log('unzipped')
        }
        console.log('all done.');
        fs.rmdir(downloadPath, { recursive: true },function(){
            return;
        })
    });
});
