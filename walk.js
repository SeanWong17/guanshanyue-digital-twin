import * as THREE from 'three';
import boundary from './data/site_boundary.json';
export function insidePolygon(x,z,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;
 }
 return inside;
}
export function setupWalk({camera,controls,host,canvas,data}){
 const button=document.querySelector('#walk'),keys=new Set();
 const footprints=data.buildings.slice(0,15).filter(b=>b.isThisCommunity).map(b=>b.shape.map(p=>[p.x,p.y]));
 const overlay=document.createElement('div');overlay.className='walk-overlay';overlay.hidden=true;
 overlay.innerHTML='<div class="walk-hint">WASD / 方向键移动 · Shift 加速<br>拖动视野转头 · Esc 退出</div><canvas class="walk-map" width="176" height="230" aria-label="漫游小地图：当前位置和朝向"></canvas><div class="walk-pad"><button data-key="KeyW" aria-label="前进">↑</button><div><button data-key="KeyA" aria-label="左移">←</button><button data-key="KeyS" aria-label="后退">↓</button><button data-key="KeyD" aria-label="右移">→</button></div></div>';
 host.append(overlay);
 const map=overlay.querySelector('canvas'),ctx=map.getContext('2d');
 let active=false,yaw=Math.PI/2,pitch=0,last=0,saved,drag=null;
 function blocked(x,z){
  if(x< -170||x>32||z< -145||z>167)return true;
  return footprints.some(p=>insidePolygon(x,z,p)||p.some((a,i)=>{
   const b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1];
   const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz||1)));
   return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<.35;
  }));
 }
 function drawMap(){
  const sx=x=>(x+175)*.8,sy=z=>(z+145)*.7;
  ctx.fillStyle='#edf2e9';ctx.fillRect(0,0,176,230);
  function polygon(points,fill){ctx.beginPath();points.forEach(([x,z],i)=>i?ctx.lineTo(sx(x),sy(z)):ctx.moveTo(sx(x),sy(z)));ctx.closePath();ctx.fillStyle=fill;ctx.fill();}
  polygon(boundary,'#c6d8b6');footprints.forEach(p=>polygon(p,'#81918e'));
  const x=sx(camera.position.x),y=sy(camera.position.z);
  ctx.save();ctx.translate(x,y);ctx.rotate(-yaw);ctx.fillStyle='#db573d';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(-5,5);ctx.lineTo(5,5);ctx.closePath();ctx.fill();ctx.restore();
  ctx.fillStyle='#29463c';ctx.font='12px sans-serif';ctx.fillText('N ↑',145,16);ctx.fillText('● 当前位置',8,220);
 }
 function rotate(){camera.quaternion.setFromEuler(new THREE.Euler(pitch,yaw,0,'YXZ'));}
 function exit(){
  if(!active)return;active=false;keys.clear();drag=null;overlay.hidden=true;button.textContent='进入小区漫游';button.setAttribute('aria-pressed','false');canvas.style.cursor='';
  camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.near=saved.near;camera.fov=saved.fov;camera.updateProjectionMatrix();controls.target.copy(saved.target);controls.enabled=true;controls.update();
 }
 function enter(){
  if(active)return;
  saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),target:controls.target.clone(),near:camera.near,fov:camera.fov};
  controls.enabled=false;active=true;last=0;yaw=Math.PI/2;pitch=0;
  // East courtyard, just inside the through-passage entrance.
  const spawn=[[-1,44],[-5,40],[-53,-39]].find(([x,z])=>!blocked(x,z));
  if(!spawn){exit();return;}
  camera.position.set(spawn[0],2.2,spawn[1]);camera.near=.08;camera.fov=70;camera.updateProjectionMatrix();rotate();
  overlay.hidden=false;button.textContent='退出小区漫游';button.setAttribute('aria-pressed','true');canvas.style.cursor='grab';drawMap();
 }
 button.onclick=()=>active?exit():enter();
 const movement=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'];
 addEventListener('keydown',e=>{if(!active)return;if(e.code==='Escape'){exit();return;}if(/INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)&&e.target!==button)return;if(movement.includes(e.code)){keys.add(e.code);e.preventDefault();}});
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{keys.clear();drag=null;});
 document.addEventListener('visibilitychange',()=>{keys.clear();last=0;});
 canvas.addEventListener('pointerdown',e=>{if(active&&e.button===0){drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}});
 canvas.addEventListener('pointermove',e=>{if(!active||drag?.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag.y)*.004,-1.35,1.35);drag.x=e.clientX;drag.y=e.clientY;rotate();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=null;});
 overlay.querySelectorAll('[data-key]').forEach(el=>{el.onpointerdown=e=>{e.preventDefault();el.setPointerCapture(e.pointerId);keys.add(el.dataset.key);};for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>keys.delete(el.dataset.key));});
 function tick(t){
  if(!active)return;const dt=last?Math.min((t-last)/1000,.05):0;last=t;
  let forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  let side=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const len=Math.hypot(forward,side)||1;forward/=len;side/=len;
  const speed=(keys.has('ShiftLeft')||keys.has('ShiftRight')?4.2:1.5)*dt;
  const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed;
  if(!blocked(camera.position.x+dx,camera.position.z))camera.position.x+=dx;
  if(!blocked(camera.position.x,camera.position.z+dz))camera.position.z+=dz;
  camera.position.y=(insidePolygon(camera.position.x,camera.position.z,boundary)?.5:0)+1.7;
  drawMap();
 }
 return {enter,exit,tick,blocked,get active(){return active;}};
}
