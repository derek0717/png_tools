/* node single2wtsapp 14176479/372824145@2x.png
* outputs to: 372824145@2x_1x10_L_wtsapp.png
*/
const fs = require('fs')
const path = require('path');
const UPNG = require('@pdf-lib/upng').default;

let stickerPath = process.argv[2];

const inputBasePath = './_test';
const outputPath = './_test';

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

    let initialFrameArr = imgObj.frames.map((value,index)=>index);
    let customPostfix = "_";
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
            customPostfix = customPostfix+(index)+"x"+(repeat)+"_";
        }
    });

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

    let isSameFrameArr = frameArr.map(input=>0);
    for(var i=1;i<frameArr.length;i++){
        if(frameArr[i-1]==frameArr[i] && isSameFrameArr[i-1]!=1){
            isSameFrameArr[i]=1;
        }
    }
    let newImg = [];
    frameArr.forEach((input,index)=>{
        newImg[index] = (isSameFrameArr[index]==1)?createFillerFrame(img[input]):img[input];
    })
    img = newImg;

    // if((Buffer.from(newImg[0]).toString('base64'))==(Buffer.from(newImg[newImg.length-1]).toString('base64'))){
    //     delayArr.push(minDelay)
    //     newImg.push(createFillerFrame(newImg[newImg.length-1]))
    //     customPostfix = customPostfix+"L_";
    //     frameArr.push(frameArr[frameArr.length-1])
    // }
    console.log(JSON.stringify(delayArr));
    console.log(JSON.stringify(frameArr));
    let tabs={
        "loop": imgObj.tabs.acTL.num_plays || 0
    }
    let imageEncoded = UPNG.encode(img,originalWidth,originalHeight,0,delayArr, tabs, null);
    let buffer = Buffer.from( imageEncoded );

    customPostfix = customPostfix+"wts";
    let outputFileName = stickerPath.split('.')[0]+customPostfix+'.'+stickerPath.split('.')[1];

    let pngOut = fs.createWriteStream(path.join(outputPath, outputFileName));
    // will overwrite file with same filename
    pngOut.write(buffer);
    pngOut.end();
    console.log('processed ' + outputFileName);

    console.log('all done.');
});