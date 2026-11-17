import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('.',import.meta.url));
const server=await createServer({configFile:false,root,server:{host:'127.0.0.1',port:5176,strictPort:true},clearScreen:false});
await server.listen();
console.log('独立激光雷达预览：http://localhost:5176/preview.html');
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,async()=>{await server.close();process.exit(0);});
