/* converts filename parameter from inputPath to json file in decoded_json */

const fs = require('fs')
const path = require('path');
const UPNG = require('@pdf-lib/upng').default;

const inputPath = "./_output"
const outputPath = "./_output/decoded_json"

let stickerFileParamPath = process.argv[2];

if(!stickerFileParamPath.match(/^.*\.png$/)) {
    console.log(stickerFileParamPath+' not png. skipping');
    return;
}

let stickerFileName = stickerFileParamPath.split('/')[stickerFileParamPath.split('/').length-1];

// init folders
[ outputPath ].forEach(function(path){
    if (!fs.existsSync(path)){
        fs.mkdirSync(path);
    }
});

fs.readdir(inputPath, function (err, files) {
    if (err) {
        console.error("Could not list input directory.", err);
        throw err;
    }
    let imgBuffer = fs.readFileSync(path.join(inputPath, stickerFileParamPath)).buffer;
    const imgObj = UPNG.decode(imgBuffer);

    let outputFileName = stickerFileName+'.decode.json';

    let pngOut = fs.createWriteStream(path.join(outputPath, outputFileName));
    // will overwrite file with same filename

    imgObj.frames.forEach((item, index)=>{
        if (index<1) return;
        imgObj.frames[index].data={ 'keyCount': Object.keys(imgObj.frames[index].data).length }
    })
    imgObj.data=['length', imgObj.data.length]

    pngOut.write(JSON.stringify(imgObj));
    pngOut.end();
    console.log('processed ' + outputFileName);

    console.log('all done.');
});