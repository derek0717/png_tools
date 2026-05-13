const express = require('express');
const router = express.Router();
const downloader = require('../services/downloader');
const processor = require('../services/processor');

router.post('/download', async (req,res)=>{
  try{
    const result = await downloader.download(req.body.packId);
    res.json({result});
  }catch(e){res.status(500).json({error:e.toString()});}
});

router.post('/generate', async (req,res)=>{
  try{
    const result = await processor.generate(req.body.packId);
    res.json({result});
  }catch(e){res.status(500).json({error:e.toString()});}
});

module.exports = router;
