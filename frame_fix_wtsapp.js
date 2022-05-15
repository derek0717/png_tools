/*
* findings
* whatsapp adds all delay and divide evenly for all frames
* seems to omit consecutive identical frames
* */
/* grab filename from param input, go to output folder, output custom file */
/* node frame_fix_wtsapp.js 14176479/372824145@2x.png */
/* node frame_fix_wtsapp.js 1416812/16007328@2x.png [0,300,100,700,100,100,100,100,100,100,1500] */
/* if value in array is 0, the frame is removed */
/* node frame_fix_wtsapp.js 111/222@2x.png [100,100,100,100] [0, 1, 2, 2] custom_postfix_text */
/* add frame number to remove/rearrange/duplicate frames */
const fs = require('fs')
const path = require('path');
const UPNG = require('@pdf-lib/upng').default;

let stickerPath = process.argv[2];
let delayArrString = process.argv[3];
let frameArrString = process.argv[4];
let customPostfix = process.argv[5]||'';

const inputBasePath = './_test';
const outputPath = './_test';

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
    }

    let img = UPNG.toRGBA8(imgObj);

    function createFillerFrame(originalFrame){
        const fillerPixel = new Uint8Array([255,255,255,1]);
        let outputImageArr = new Uint8Array(originalWidth * originalHeight * 4);
        outputImageArr.set(Buffer.from(originalFrame), 0);
        // add 2 transparent white pixels to top-left so whatsapp think they are different frames
        for(var j=0;j<2;j++){
            outputImageArr.set(fillerPixel, j*4);
        }
        return outputImageArr.buffer;
    }

    if(frameArrInput){
        let isSameFrameArr = frameArrInput.map(input=>0);
        for(var i=1;i<frameArrInput.length;i++){
            if(frameArrInput[i-1]==frameArrInput[i] && isSameFrameArr[i-1]!=1){
                isSameFrameArr[i]=1;
            }
        }
        let newImg = [];
        frameArrInput.forEach((input,index)=>{
            newImg[index] = (isSameFrameArr[index]==1)?createFillerFrame(img[input]):img[input];
        })
        img = newImg;

        // if((Buffer.from(newImg[0]).toString('base64'))==(Buffer.from(newImg[newImg.length-1]).toString('base64'))){
        //     console.log('first & last frames are the same. Need to add a frame to prevent frame skip when whatsapp animation ends')
        // } else {
        //     console.log('first & last frames NOT same')
        // }
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
    let tabs={
        "loop": imgObj.tabs.acTL.num_plays || 0
    }
    let imageEncoded = UPNG.encode(img,originalWidth,originalHeight,0,delayArr, tabs, null);
    let buffer = Buffer.from( imageEncoded )

    let outputFileName = stickerPath.split('.')[0]+delayPostfix+customPostfix+'.'+stickerPath.split('.')[1];

    let pngOut = fs.createWriteStream(path.join(outputPath, outputFileName));
    // will overwrite file with same filename
    pngOut.write(buffer);
    pngOut.end();
    console.log('processed ' + outputFileName);

    console.log('all done.');
});