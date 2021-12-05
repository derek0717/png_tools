/* downloads and unzips to unzipped folder */
/* node downloadunzip 17232199 */

const fs = require('fs')
const https = require('https')
const AdmZip = require('adm-zip');

let linePackId = process.argv[2];
if(!linePackId) {console.log('no Line sticker pack ID'); return;}

const linePackRemotePath = 'https://stickershop.line-scdn.net/stickershop/v1/product/'+linePackId+'/iphone/stickerpack@2x.zip';
const lineStaticPackRemotePath = 'https://stickershop.line-scdn.net/stickershop/v1/product/'+linePackId+'/iphone/stickers@2x.zip';

const outputPath = './_output',
    downloadsPath = outputPath+'/downloads',
    zipPath = downloadsPath+'/zip',
    zipPackPath = zipPath+'/'+linePackId,
    unzippedPath = outputPath+'/unzipped',
    unzippedPackPath = unzippedPath+'/'+linePackId,
    unzippedAnimationPath = unzippedPackPath+'/stickerpack',
    unzippedStaticPath = unzippedPackPath+'/sticker',
    packOutputPath = outputPath+'/'+linePackId;

let animationZipFileName = 'stickerpack.zip',
    animationZipFileFullPath = zipPackPath+'/'+animationZipFileName,
    staticZipFileName = 'sticker.zip',
    staticZipFileFullPath = zipPackPath+'/'+staticZipFileName;

/* init folders */
function initFolder(path, removeExisting=false){
    if (!fs.existsSync(path)){
        fs.mkdirSync(path);
    } else {
        if(removeExisting){
            fs.rmdir(path, { recursive: true },function(){
                fs.mkdirSync(path);
            });
        }
    }
}

[ outputPath, downloadsPath, zipPath, zipPackPath, unzippedPath, unzippedPackPath, packOutputPath ].forEach(function(path){
    initFolder(path);
});

https.get(linePackRemotePath, function(response) {
    response.pipe(fs.createWriteStream(animationZipFileFullPath)).on('close', function(){
        console.log('downloaded');
        var fileSizeInBytes = (fs.statSync(animationZipFileFullPath)).size
        console.log('size: '+fileSizeInBytes+' bytes');
        if(fileSizeInBytes<11111){
            // static
            console.log('NOT_FOUND: Animation package with id '+linePackId+' not found, downloading static package');
            fs.unlinkSync(animationZipFileFullPath)
            https.get(lineStaticPackRemotePath, function(response) {
                response.pipe(fs.createWriteStream(staticZipFileFullPath)).on('close', function () {
                    console.log('downloaded');
                    const admZipFile = new AdmZip(staticZipFileFullPath);
                    admZipFile.extractAllTo(unzippedStaticPath, true);
                    console.log('unzipped')
                })
            });
        } else {
            // animation
            const admZipFile = new AdmZip(animationZipFileFullPath);
            admZipFile.extractAllTo(unzippedAnimationPath, true);
            console.log('unzipped')
        }
        fs.rmdir(zipPackPath, { recursive: true },function(){
            console.log('zip folder removed')
        })
        console.log('all done.');
    });
});
