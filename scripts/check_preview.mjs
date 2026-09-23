import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
await fs.mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
const errors=[];
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto((process.env.PREVIEW_URL || 'http://localhost:4173/')+'?building=11&sun=1');await page.waitForFunction(()=>window.__community?.sunlight,{timeout:120000});
 assert.equal(await page.locator('aside a').count(),0);
 assert.equal(await page.locator('#buildings').inputValue(),'10');assert(await page.locator('#sun-enabled').isChecked());
 await page.locator('#sun-date').fill('2026-12-22');await page.locator('#sun-date').dispatchEvent('change');
 await page.locator('#sun-time').fill('720');await page.locator('#sun-time').dispatchEvent('input');
 const winter=await page.evaluate(()=>window.__community.sunlight.position.altitude);assert(winter>28&&winter<32);
 await page.locator('#top').click();await page.waitForTimeout(500);await page.locator('#sun-pick').click();
 const point=await page.evaluate(()=>{const a=window.__community,p=a.controls.target.clone().set(-60,.56,-50).project(a.camera),r=document.querySelector('canvas').getBoundingClientRect();return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2};});
 await page.mouse.click(point.x,point.y);await page.waitForFunction(()=>window.__community.sunlight.result,{timeout:30000});
 const exposure=await page.evaluate(()=>window.__community.sunlight.result);assert(exposure.hours>=0&&exposure.hours<=24);
 assert.match(await page.locator('#sun-result').innerText(),/直射日照/);
 await page.locator('[data-season="06-21"]').click();assert((await page.evaluate(()=>window.__community.sunlight.position.altitude))>winter+40);
 const daylight=await page.locator('#sun-time').evaluate(el=>({min:Number(el.min),max:Number(el.max)}));assert(daylight.min>240&&daylight.max<1260);await page.locator('#sun-time').fill(String(daylight.min));await page.locator('#sun-time').dispatchEvent('input');assert((await page.evaluate(()=>window.__community.sunlight.position.altitude))>=0);
 await page.locator('#sun-play').click();await page.waitForTimeout(1000);assert(Number(await page.locator('#sun-time').inputValue())>daylight.min);await page.locator('#sun-play').click();
 await page.locator('#sun-play').click();const fullDay=await page.evaluate(()=>{const api=window.__community.sunlight;api.tick(10000000);api.tick(10100000);return {time:Number(document.querySelector('#sun-time').value),max:Number(document.querySelector('#sun-time').max),label:document.querySelector('#sun-play').textContent,altitude:api.position.altitude};});assert.equal(fullDay.time,fullDay.max);assert.equal(fullDay.label,'播放日出至日落');assert(fullDay.altitude>=0);
 await page.locator('#sun-time').fill('900');await page.locator('#sun-time').dispatchEvent('input');
 await page.screenshot({path:new URL('../test-results/sunlight-desktop.png',import.meta.url).pathname});
 const shadow=await page.evaluate(()=>{const sun=window.__community.scene.children.find(o=>o.isDirectionalLight);return {cast:sun.castShadow,map:!!sun.shadow.map,proxies:window.__community.sunlight.proxies.length};});assert(shadow.cast&&shadow.map&&shadow.proxies>15);
 await page.setViewportSize({width:390,height:844});await page.waitForTimeout(500);assert(!await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth));await page.locator('#sun-enabled').uncheck();assert.match(await page.locator('#sun-position').innerText(),/已关闭/);
 assert.deepEqual(errors,[]);const report={deepLinkBuilding:11,winterNoonAltitude:winter,exposure,shadow,playback:true,daylightOnly:true,stopsAtSunset:fullDay,mobileNoOverflow:true,errors};await fs.writeFile(new URL('../test-results/sunlight-web-check.json',import.meta.url),JSON.stringify(report,null,2));console.log(report);
}finally{await browser.close();}
