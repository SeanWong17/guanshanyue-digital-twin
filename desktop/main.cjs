const {app,BrowserWindow,protocol,session}=require('electron');
const {readFile}=require('node:fs/promises');
const path=require('node:path');
protocol.registerSchemesAsPrivileged([{scheme:'guanshanyue',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const origin='guanshanyue://app';
function openWindow(){
 const win=new BrowserWindow({width:1440,height:960,minWidth:800,minHeight:600,title:'Guanshanyue · 小区三维模型',autoHideMenuBar:true,backgroundColor:'#dfe8e6',webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/'))event.preventDefault();});
 win.loadURL(origin+'/index.html');
}
app.whenReady().then(()=>{
 const root=path.join(app.getAppPath(),'dist');
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.glb':'model/gltf-binary'};
 protocol.handle('guanshanyue',async request=>{
  try{
   const url=new URL(request.url);
   if(url.host!=='app'||request.method!=='GET')return new Response(null,{status:403});
   const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
   if(!file.startsWith(root+path.sep))return new Response(null,{status:403});
   const body=await readFile(file);
   return new Response(body,{headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'"}});
  }catch{return new Response(null,{status:404});}
 });
 // All model and solar data are bundled; the desktop viewer needs no network.
 session.defaultSession.webRequest.onBeforeRequest((details,callback)=>callback({cancel:/^https?:/i.test(details.url)}));
 openWindow();
 app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)openWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
