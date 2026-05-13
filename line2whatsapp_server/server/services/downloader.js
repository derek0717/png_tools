const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const AdmZip = require('adm-zip');

exports.download = async (packId)=>{
  const url = `https://stickershop.line-scdn.net/stickershop/v1/product/${packId}/iphone/stickerpack@2x.zip`;
  const root = path.join(__dirname,'../../data',packId);
  const zipPath = path.join(root,'pack.zip');

  fs.mkdirSync(root,{recursive:true});

  const res = await fetch(url);
  await new Promise(r=>res.body.pipe(fs.createWriteStream(zipPath)).on('finish',r));

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(root,true);

  // IMPORTANT: return path
  const animPath = path.join(root);
  return animPath;
};