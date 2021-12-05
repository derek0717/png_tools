/* grab filename from param input, go to output folder, add delay to end frame, replace file */
/* node frame_fix 14176479/372824145@2x.png */
/* node frame_fix.js 1416812/16007328@2x.png [0,300,100,700,100,100,100,100,100,100,1500] */
/* if value in array is 0, the frame is removed */
/* node frame_fix.js 111/222@2x.png [100,100,100, 100] [0, 1, 2, 2] */
/* add frame number to remove/rearrange/duplicate frames */

const fs = require('fs')
const path = require('path');
const UPNG = require('@pdf-lib/upng').default;

let stickerPath = process.argv[2];
let delayArrString = process.argv[3];
let frameArrString = process.argv[4];


let delayArrInput = null;

if(delayArrString) {
    delayArrInput = eval(delayArrString);
    if (!Array.isArray(delayArrInput)){
        console.log("delay array at argv[3] is not an array. skipped. ");
        delayArrInput = null;
    } else {
        delayArrInput = delayArrInput.map(val=>parseInt(val));
    }
}
let frameArrInput = null;

if(frameArrString) {
    frameArrInput = eval(frameArrString);
    if (!Array.isArray(frameArrInput)){
        console.log("frame array at argv[4] is not an array. skipped. ");
        frameArrInput = null;
    } else {
        frameArrInput = frameArrInput.map(val=>parseInt(val));
    }
}

if(!stickerPath.match(/^.*\.png$/)) {
    console.log(stickerPath+' not png. skipping');
    return;
}

const inputBasePath = './_output';
const outputPath = './_output';

fs.readdir(inputBasePath, function (err, files) {
    if (err) {
        console.error("Could not list input directory.", err);
        throw err;
    }
    let imgBuffer = fs.readFileSync(path.join(inputBasePath, stickerPath)).buffer;
    const imgObj = UPNG.decode(imgBuffer);
    const originalWidth=imgObj.width,
        originalHeight=imgObj.height;
    const readDelayArr = imgObj.frames.map(value=>{
        return value.delay
    });

    let delayPostfix = '';

    let delayArr = readDelayArr;

    if(delayArrInput){
        delayArr = delayArrInput;
        delayPostfix = '_custom'
    }else{
        // update delayArr to add to last frame
        delayArr[delayArr.length-1] = Math.min(700,(delayArr.reduce((acc,dis)=>(acc+dis))));
        delayPostfix = '_'+(delayArr[delayArr.length-1])
    }

    let img = UPNG.toRGBA8(imgObj);

    if(frameArrInput){
        let newImg = [];
        frameArrInput.forEach((input,index)=>{
            newImg[index] = img[input];
        })
        img = newImg;
    }

    for(let i=(delayArr.length-1);i>-1;i--){
        if(delayArr[i]===0){
            img[i]='remove';
            delayArr[i]='remove'
        }
    }

    img=img.filter(item=>(item!=='remove'))
    delayArr=delayArr.filter(item=>(item!=='remove'))
    console.log(JSON.stringify(delayArr))

    let imageEncoded = UPNG.encode(img,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),0,delayArr);
    let buffer = Buffer.from( imageEncoded )
    let sizePostfix='';
    if(buffer.length>(1024*300)){
        imageEncoded = UPNG.encode(img,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),256,delayArr);
        buffer = Buffer.from( imageEncoded )
        sizePostfix='*';
        if(buffer.length>(1024*300)){
            imageEncoded = UPNG.encode(img,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),128,delayArr);
            buffer = Buffer.from( imageEncoded )
            sizePostfix='**';
            if(buffer.length>(1024*300)){
                imageEncoded = UPNG.encode(img,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),64,delayArr);
                buffer = Buffer.from( imageEncoded )
                sizePostfix='***';
                if(buffer.length>(1024*300)){
                    imageEncoded = UPNG.encode(img,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),32,delayArr);
                    buffer = Buffer.from( imageEncoded )
                    sizePostfix='****';
                    if(buffer.length>(1024*300)){
                        imageEncoded = UPNG.encode(img,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),16,delayArr);
                        buffer = Buffer.from( imageEncoded )
                        sizePostfix='*****';
                        if(buffer.length>(1024*300)){
                            imageEncoded = UPNG.encode(img,Math.max(originalWidth,originalHeight),Math.max(originalWidth,originalHeight),8,delayArr);
                            buffer = Buffer.from( imageEncoded )
                            sizePostfix='***** *';
                        }
                    }
                }
            }
        }
    }

    let outputFileName = stickerPath.split('.')[0]+delayPostfix+'.'+stickerPath.split('.')[1];

    let pngOut = fs.createWriteStream(path.join(outputPath, outputFileName));
    // will overwrite file with same filename
    pngOut.write(buffer);
    pngOut.end();
    console.log('processed ' + outputFileName + sizePostfix);

    console.log('all done.');
});