const fs = require('fs')
let UPNG = require('@pdf-lib/upng').default;

let imgBuffer = fs.readFileSync('input/drafts/354631515@2x.png').buffer;
const imgObj = UPNG.decode(imgBuffer);

let imageData={
    width: imgObj.width,
    height: imgObj.height
};
if(imageData.width==imageData.height){
    imageData.newWidth=parseInt(imageData.width);
    imageData.newHeight=parseInt(imageData.height);
    imageData.addLeft=0;
    imageData.addTop=0;
} else if(imageData.width>imageData.height){
    imageData.newWidth=parseInt(imageData.width);
    imageData.newHeight=parseInt(imageData.width);
    imageData.addLeft=0;
    imageData.addTop=Math.floor((imageData.width-imageData.height)/2);
} else {
    imageData.newWidth=parseInt(imageData.height);
    imageData.newHeight=parseInt(imageData.height);
    imageData.addLeft=Math.floor((imageData.height-imageData.width)/2);
    imageData.addTop=0;
}
let frameDataArr=[];
let delayArr=[];
let newFrames=[];
const pixel = new Uint8Array([255,255,255,0]);
let img = UPNG.toRGBA8(imgObj);
imgObj.frames.forEach((frame, index)=>{
    delayArr[parseInt(index)] = frame.delay;
    let frameData = {
        rect: {
            // x: frame.rect.x,
            // y: frame.rect.y,
            // width: frame.rect.width,
            // height: frame.rect.height,
            x: 0,
            y: 0,
            width: imageData.width,
            height: imageData.height,
        },
        topEmptyHeight: (imageData.addTop+frame.rect.y),
        leftEmptyWidth: (imageData.addLeft+frame.rect.x),
        rightEmptyWidth: (imageData.newWidth-imageData.addLeft-frame.rect.x-frame.rect.width),
        botEmptyHeight: (imageData.newHeight-imageData.addTop-frame.rect.y-frame.rect.height),

        dispose: frame.dispose
    }
    let outputImageArr = new Uint8Array(imageData.newWidth * imageData.newHeight * 4);
    // fill empty
    for(let i=0; i<(imageData.newWidth * imageData.newHeight); i++){
        outputImageArr.set(pixel, i * 4);
    }
    // fill middle
    const originalArr = Buffer.from(img[index]);

    for(let i=frameData.topEmptyHeight; i<(frameData.topEmptyHeight+frameData.rect.y+frameData.rect.height); i++){
        const originalRow = originalArr.subarray(frameData.rect.width * i * 4, frameData.rect.width * (i + 1) * 4);
        outputImageArr.set(originalRow, (i * imageData.newWidth + frameData.leftEmptyWidth) * 4);
    }
    // fill bottom
    newFrames[parseInt(index)] = outputImageArr;
    frameDataArr[parseInt(index)] = frameData;
});

let redImgReady = UPNG.encode([newFrames[1]],imageData.newWidth,imageData.newHeight,0/*,delayArr*/);

let all = fs.createWriteStream("output/out.png");
let buffer = new Buffer( redImgReady )
all.write(buffer);
all.end();
console.log('finished');
console.log(frameDataArr[1]);