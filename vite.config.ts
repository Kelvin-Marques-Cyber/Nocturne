import {defineConfig} from 'vite';
export default defineConfig({publicDir:process.env.VITE_STATIC==='true'?false:'public',worker:{format:'es'},build:{outDir:'dist'},server:{host:'0.0.0.0',allowedHosts:['terminal.local','localhost']}});
