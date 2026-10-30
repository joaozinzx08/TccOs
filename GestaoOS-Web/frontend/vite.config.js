import {defineConfig} from 'vite';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
const envPath=path.resolve(import.meta.dirname,'../backend/.env');
const env=existsSync(envPath)?readFileSync(envPath,'utf8'):'';
const apiPort=process.env.PORT||env.match(/^PORT=(\d+)/m)?.[1]||3000;
export default defineConfig({server:{host:'127.0.0.1',port:Number(process.env.VITE_PORT||5173),strictPort:true,proxy:{'/api':`http://127.0.0.1:${apiPort}`}},build:{outDir:'dist'}});
