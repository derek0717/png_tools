/* downloads, unzips and processes stickers to square, save in output folder */
/* node line2wtsapp 16361450 */

const fs = require('fs')
const https = require('https')
const path = require('path');
const UPNG = require('@pdf-lib/upng').default;
const AdmZip = require('adm-zip');

let linePackId = process.argv[2];
let dynamicType = process.argv[3] || false;
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
    packOutputPath = outputPath+'/wts_'+linePackId;

let animationInputPath = unzippedAnimationPath+'/animation@2x';
if(dynamicType=='popup'){
    /* for popup style line animations */
    animationInputPath = unzippedAnimationPath+'/popup';
}
const staticInputPath = unzippedStaticPath,
    animationZipFileName = 'stickerpack.zip',
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

console.log('downloading pack '+linePackId+'...');

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
                    fs.readdir(staticInputPath, function (err, files) {
                        if (err) {
                            console.error('Could not list the directory.', err);
                            process.exit(1);
                        }
                        files.forEach(function (file, index) {
                            if (!file.match(/^[0-9]*@2x\.png$/)) {
                                return;
                            }
                            try {
                                fs.copyFileSync(path.join(staticInputPath, file), path.join(packOutputPath, file));
                            } catch (e){
                                console.error('failed to copy ' + file, err);
                                throw err;
                            }
                            console.log('copied '+file);
                        });
                        console.log('static all done.');
                        fs.rm(unzippedPackPath, { recursive: true },function(){
                            return;
                        })
                    });
                })
            });
        } else {
            // animation
            const admZipFile = new AdmZip(animationZipFileFullPath);
            admZipFile.extractAllTo(unzippedAnimationPath, true);
            console.log('unzipped')

            let productinfo = JSON.parse(fs.readFileSync(path.join(unzippedAnimationPath,'productinfo.meta')));
            console.log('----------------------');
            console.log(productinfo.title.en);
            console.log(productinfo.author.en);
            console.log('----------------------');

            fs.copyFileSync(path.join(unzippedAnimationPath, 'tab_on@2x.png'), path.join(packOutputPath, 'tab_on@2x.png'), (err) => {
                if (err) {
                    console.error('failed to copy tab_on@2x.png', err);
                    throw err;
                }
            });
            console.log('copied tab_on');
            fs.readdir(animationInputPath, function (err, files) {
                if (err) {
                    console.error('Could not list input directory.', err);
                    throw err;
                }
                files.forEach(function (file, index) {
                    if(!file.match(/^.*\.png$/)) {
                        console.log(file+' not png. skipping');
                        return;
                    }
                    let imgBuffer = fs.readFileSync(path.join(animationInputPath, file)).buffer;
                    const imgObj = UPNG.decode(imgBuffer);
                    const originalWidth=imgObj.width,
                        originalHeight=imgObj.height;
                    const readDelayArr = imgObj.frames.map(value=>{
                        return value.delay
                    });

                    let initialFrameArr = imgObj.frames.map((value,index)=>index);
                    let postfix = " ";
                    const minDelay = Math.min(...readDelayArr);
                    let delayArr = [], frameArr = [];
                    readDelayArr.forEach((delayValue, index)=>{
                        if(delayValue<=minDelay){
                            delayArr.push(minDelay)
                            frameArr.push(initialFrameArr[index])
                        } else {
                            // add extra delays and extra frames
                            const repeat = Math.floor(Math.max(delayValue/minDelay, 1));
                            for(var i=0;i<repeat;i++){
                                delayArr.push(minDelay)
                                frameArr.push(initialFrameArr[index])
                            }
                            postfix = postfix+(index)+"x"+(repeat)+" ";
                        }
                    });
                    if(frameArr.length>=35) {
                        postfix = postfix + "OVER 35 FRAMES WARNING "
                    }

                    let img = UPNG.toRGBA8(imgObj);
                    function createFillerFrame(originalFrame) {
                        const fillerPixel = new Uint8Array([255, 255, 255, 1]);
                        let outputImageArr = new Uint8Array(originalWidth * originalHeight * 4);
                        outputImageArr.set(Buffer.from(originalFrame), 0);
                        // add 2 transparent white pixels to top-left so whatsapp think they are different frames
                        for (var j = 0; j < 2; j++) {
                            outputImageArr.set(fillerPixel, j * 4);
                        }
                        return outputImageArr.buffer;
                    }

                    let isSameFrameArr = frameArr.map(input=>0);
                    for(var i=1;i<frameArr.length;i++){
                        if(frameArr[i-1]==frameArr[i] && isSameFrameArr[i-1]!=1){
                            isSameFrameArr[i]=1;
                        }
                    }
                    let frames = [];
                    frameArr.forEach((input,index)=>{
                        frames[index] = (isSameFrameArr[index]==1)?createFillerFrame(img[input]):img[input];
                    })

                    // if((Buffer.from(frames[0]).toString('base64'))==(Buffer.from(frames[frames.length-1]).toString('base64'))){
                    //     delayArr.push(minDelay)
                    //     frames.push(createFillerFrame(frames[frames.length-1]))
                    //     postfix = postfix+"+L";
                    //     frameArr.push(frameArr[frameArr.length-1])
                    // }
                    let tabs={
                        "loop": imgObj.tabs.acTL.num_plays || 0
                    }

                    let imageEncoded = UPNG.encode(frames,originalWidth,originalHeight,0/*256*/,delayArr, tabs, null);
                    let buffer = Buffer.from( imageEncoded )

                    let pngOut = fs.createWriteStream(path.join(packOutputPath, 'wts_'+file));
                    pngOut.write(buffer);
                    pngOut.end();
                    console.log('processed '+file+postfix);
                })
                fs.rmdir(zipPackPath, { recursive: true },function(){
                    console.log('zip folder removed')
                })
                fs.rmdir(unzippedPackPath, { recursive: true },function(){
                    console.log('unzipped folder removed')
                })
                console.log('all done.');
                let absolutePath = path.resolve(packOutputPath);
                require('child_process').exec('open "'+absolutePath+'"');
            });
        }
    });
});
