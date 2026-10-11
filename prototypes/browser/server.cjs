// Loopback-only static server. No dependencies and no upload endpoint.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const files={'/':'index.html','/index.html':'index.html','/codec.js':'codec.js','/app.js':'app.js'};
const server=http.createServer((req,res)=>{const name=files[req.url.split('?')[0]];if(!name){res.writeHead(404);res.end('Not found');return}res.setHeader('Content-Type',name.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');res.setHeader('Cache-Control','no-store');fs.createReadStream(path.join(__dirname,name)).pipe(res)});
server.on('error',e=>{console.error(e.message);process.exitCode=1});server.listen(8787,'127.0.0.1',()=>console.log('Optical Link Lab: http://localhost:8787 — Ctrl+C to stop'));
