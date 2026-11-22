const { app, BrowserWindow, session } = require('electron');
const path = require('path');
function createWindow(){
 const win=new BrowserWindow({width:1440,height:960,minWidth:760,minHeight:680,show:false,autoHideMenuBar:true,backgroundColor:'#080d18',title:'MotionVerse — Body Outline',webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
 win.once('ready-to-show',()=>win.show());
 win.loadFile(path.join(__dirname,'..','dist','index.html'));
}
app.whenReady().then(()=>{
 session.defaultSession.setPermissionCheckHandler((_wc,permission)=>permission==='media'||permission==='camera');
 session.defaultSession.setPermissionRequestHandler((_wc,permission,callback)=>callback(permission==='media'||permission==='camera'));
 createWindow();app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});