import {defineConfig} from 'vite';
import {copyFileSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
export default defineConfig({base:'./',build:{target:'es2022'},plugins:[{name:'model-assets',closeBundle(){
 for(const file of ['data/site_v2.json','output/community_v1.glb']){const out=resolve(root,'dist',file);mkdirSync(dirname(out),{recursive:true});copyFileSync(resolve(root,file),out);}
}}]});
