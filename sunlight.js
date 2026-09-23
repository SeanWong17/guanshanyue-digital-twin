import * as THREE from 'three';
import {solarPosition,dailyExposure,clockLabel,daylightPeriods} from './solar.js';
export function setupSunlight({scene,renderer,sun,ambient,camera,controls,model,data,host}){
 const $=id=>document.getElementById(id),ray=new THREE.Raycaster(),proxies=[],group=new THREE.Group();group.name='Sunlight building envelopes';scene.add(group);
 const material=new THREE.MeshBasicMaterial({colorWrite:false,depthWrite:false,side:THREE.DoubleSide});
 function envelope(points,base,height,index){
  if(!points||height<=0)return;
  const shape=new THREE.Shape(points.map(p=>new THREE.Vector2(p.x,-p.y)));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false});geometry.rotateX(-Math.PI/2);geometry.translate(0,base,0);
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.userData.building=index;group.add(mesh);proxies.push(mesh);
 }
 data.buildings.forEach((b,i)=>{if(!b.isThisCommunity)return;const top=i<13&&b.top_shape?b.totalHeight/b.floors:0;envelope(b.shape,.5,b.totalHeight-top,i);if(top)envelope(b.top_shape,.5+b.totalHeight-top,top,i);});
 group.updateMatrixWorld(true);
 model.traverse(o=>{if(o.isMesh){o.receiveShadow=true;o.castShadow=false;}});
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-220,right:220,top:220,bottom:-220,near:1,far:800});sun.shadow.camera.updateProjectionMatrix();sun.shadow.bias=-.00015;sun.shadow.normalBias=.10;
 sun.target.position.set(-50,0,0);scene.add(sun.target);
 const marker=new THREE.Mesh(new THREE.SphereGeometry(.6,12,8),new THREE.MeshBasicMaterial({color:0xff6633}));marker.visible=false;scene.add(marker);
 const north=new THREE.ArrowHelper(new THREE.Vector3(0,0,-1),new THREE.Vector3(3,1,117),12,0x176d69,3,1.5);scene.add(north);
 $('sun-date').value=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Shanghai'});
 $('latitude').value=data.latitude;$('longitude').value=data.longitude;$('north-angle').value=data.northAngle||0;
 let sample=null,picking=false,playing=false,lastTick=null,lastStep=0,dayKey=null,periods=[];
 const enabled=()=>$('sun-enabled').checked;
 function settings(){return {date:$('sun-date').value,latitude:Number($('latitude').value),longitude:Number($('longitude').value),northAngle:Number($('north-angle').value)};}
 function lit(direction){const dir=new THREE.Vector3(...direction);if(sample.normal.dot(dir)<=1e-6)return false;ray.set(sample.point.clone().addScaledVector(sample.normal,.12),dir);ray.near=0;ray.far=1500;return ray.intersectObjects(proxies,false).length===0;}
 function updateAnalysis(){
  if(!sample)return;
  try{const result=dailyExposure(settings(),lit);api.result=result;$('sun-result').textContent=`${sample.name} · 高度 ${Math.max(0,sample.point.y-.5).toFixed(1)} m：约 ${result.hours.toFixed(1)} 小时直射日照`;
   $('sun-intervals').textContent=result.intervals.length?result.intervals.map(([a,b])=>`${clockLabel(a)}–${clockLabel(b)}`).join('、'):'当天无直射日照';
  }catch(e){$('sun-result').textContent=e.message;$('sun-intervals').textContent='';}
 }
 function refreshDaylight(){
  const key=JSON.stringify(settings());
  if(key!==dayKey){
   periods=daylightPeriods(settings()).map(([a,b])=>[Math.ceil(a),Math.min(1439,Math.floor(b))]).filter(([a,b])=>b>a);dayKey=key;
   if(playing){stop();}
   $('sun-time').disabled=!periods.length;$('sun-play').disabled=!periods.length;
   if(periods.length){$('sun-time').min=periods[0][0];$('sun-time').max=periods.at(-1)[1];$('sun-daylight').textContent=periods.length===1&&periods[0][0]===0&&periods[0][1]===1439?'当天全天有日光':periods.map(([a,b])=>`日出 ${clockLabel(a)} · 日落 ${clockLabel(b)}`).join(' / ');}
   else{$('sun-daylight').textContent='该日期和位置没有白天，无法播放';}
  }
  if(periods.length){const m=Number($('sun-time').value);if(!periods.some(([a,b])=>m>=a&&m<=b)){$('sun-time').value=periods.flat().reduce((best,v)=>Math.abs(v-m)<Math.abs(best-m)?v:best);}}
 }
 function update(){
  try{refreshDaylight();const s=solarPosition({...settings(),hour:Number($('sun-time').value)/60});api.position=s;const on=enabled();
   $('sun-clock').textContent=clockLabel(Number($('sun-time').value));
   sun.position.copy(sun.target.position).addScaledVector(new THREE.Vector3(...s.direction),350);
   sun.intensity=on?(s.altitude>0?3:0):3;ambient.intensity=on?(s.altitude>0?.65:.20):2;
   if(!on)sun.position.set(90,180,80);
   sun.castShadow=on;renderer.shadowMap.needsUpdate=true;group.visible=on;
   scene.background.set(on&&s.altitude<=0?'#172538':'#dfe8e6');
   $('sun-position').textContent=on?(s.altitude>0?`太阳高度 ${s.altitude.toFixed(1)}° · 方位 ${s.azimuth.toFixed(1)}°（北起顺时针）`:'太阳在地平线以下，无直射日照'):'采光模拟已关闭';
   if(sample)$('sun-now').textContent=on?(s.altitude>0&&lit(s.direction)?'当前：有直射日光':'当前：无直射日光'):'';
   const a=settings().northAngle*Math.PI/180;north.setDirection(new THREE.Vector3(Math.sin(a),0,-Math.cos(a)));north.visible=on;
  }catch(e){$('sun-position').textContent=e.message;}
 }
 $('sun-enabled').onchange=()=>{if(!enabled()){stop();picking=false;$('sun-pick').textContent='选点估算日照';host.style.cursor='';}update();};
 $('sun-time').oninput=update;
 for(const id of ['sun-date','latitude','longitude','north-angle'])$(id).onchange=()=>{update();updateAnalysis();};
 document.querySelectorAll('[data-season]').forEach(b=>b.onclick=()=>{$('sun-date').value=`${$('sun-date').value.slice(0,4)||new Date().getFullYear()}-${b.dataset.season}`;update();updateAnalysis();});
 function stop(){playing=false;$('sun-play').textContent='播放日出至日落';}
 $('sun-play').onclick=()=>{if(playing){stop();return;}$('sun-enabled').checked=true;refreshDaylight();if(!periods.length)return;playing=true;lastTick=null;lastStep=0;$('sun-time').value=periods[0][0];$('sun-play').textContent='暂停';update();};
 $('sun-pick').onclick=()=>{$('sun-enabled').checked=true;picking=!picking;$('sun-pick').textContent=picking?'点击地面或楼体…':'选点估算日照';host.style.cursor=picking?'crosshair':'';update();};
 let down=null;
 renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
 renderer.domElement.addEventListener('pointerup',e=>{
  if(!picking||!down||Math.hypot(e.clientX-down[0],e.clientY-down[1])>5)return;
  const b=renderer.domElement.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-b.left)/b.width*2-1,-(e.clientY-b.top)/b.height*2+1),camera);
  const hit=ray.intersectObjects(proxies,false)[0],floor=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-.56),new THREE.Vector3());
  let point,normal,name;
  if(hit&&(!floor||ray.ray.origin.distanceTo(hit.point)<ray.ray.origin.distanceTo(floor))){point=hit.point;normal=hit.face.normal.clone().transformDirection(hit.object.matrixWorld);name=data.buildings[hit.object.userData.building].name||'配套建筑';}
  else if(floor&&floor.x>=-137&&floor.x<=10&&floor.z>=-124&&floor.z<=131&&!(floor.x< -90&&floor.z<0)){point=floor;normal=new THREE.Vector3(0,1,0);name='室外地面';}
  else{$('sun-result').textContent='请选取本小区楼体或庭院地面。';return;}
  sample={point,normal,name};marker.position.copy(point).addScaledVector(normal,.2);marker.visible=true;picking=false;host.style.cursor='';$('sun-pick').textContent='重新选点';updateAnalysis();update();
 });
 const api={update,updateAnalysis,get sample(){return sample;},get proxies(){return proxies;},result:null,position:null,tick(t){if(!playing)return;if(lastTick===null)lastTick=t;if(t-lastStep<300)return;
 const total=periods.reduce((sum,[a,b])=>sum+b-a,0),elapsed=Math.min(total,Math.floor((t-lastTick)/55));let remaining=elapsed,minute=periods.at(-1)[1];
 for(const [a,b] of periods){if(remaining<=b-a){minute=a+remaining;break;}remaining-=b-a;}
 $('sun-time').value=minute;lastStep=t;update();if(elapsed>=total)stop();}};
 update();return api;
}
