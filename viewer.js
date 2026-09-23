import * as THREE from 'three';
import {setupWalk} from './walk.js';
import {setupSunlight} from './sunlight.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const host=document.querySelector('#scene'),scene=new THREE.Scene();scene.background=new THREE.Color('#dfe8e6');
const camera=new THREE.PerspectiveCamera(45,1,1,1200),renderer=new THREE.WebGLRenderer({antialias:true,logarithmicDepthBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);host.appendChild(renderer.domElement);
renderer.toneMapping=THREE.ACESFilmicToneMapping;const ambient=new THREE.HemisphereLight(0xffffff,0x64785f,2);scene.add(ambient);const sun=new THREE.DirectionalLight(0xfff4e1,3);sun.position.set(90,180,80);scene.add(sun);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.maxPolarAngle=Math.PI/2-.02;
const data=await fetch('data/site_v2.json').then(r=>r.json());const labels=[];const select=document.querySelector('#buildings');select.innerHTML='<option value="">选择楼座</option>';
data.buildings.forEach((b,i)=>{if(!b.isThisCommunity||i===14)return;const option=document.createElement('option');option.value=i;option.textContent=i===13?'14号楼（配套配建）':b.name;select.appendChild(option);const el=document.createElement('div');el.className='label';el.style.display='none';el.textContent=b.name||'配套';host.appendChild(el);labels.push({el,p:new THREE.Vector3(b.center.x,b.totalHeight+4,b.center.y)});});
let walk;
function overview(top=false){walk?.exit();controls.target.set(-40,0,0);camera.position.set(...(top?[-40,360,.01]:[230,270,330]));controls.update();}overview();document.querySelector('#overview').onclick=()=>overview();document.querySelector('#top').onclick=()=>overview(true);
function focusBuilding(){walk?.exit();if(select.value==='')return;const i=Number(select.value),b=data.buildings[i];controls.target.set(b.center.x,b.totalHeight/2,b.center.y);camera.position.copy(controls.target).add(new THREE.Vector3(55,45,65));document.querySelector('#details').textContent=i===13?'14号楼（配套配建） · 主体5层15m＋低层裙房2层6m':`${b.name} · ${b.regularFloors ?? b.floors} 个完整楼层${b.terraceFloors ? `＋${b.terraceFloors} 个顶部退台层` : ""} · 估算高度 ${b.totalHeight} m；位置 (${b.center.x}, ${b.center.y}) m。`;};
select.onchange=()=>{focusBuilding();const url=new URL(location.href);url.searchParams.set('building',Number(select.value)+1);url.searchParams.delete('area');history.replaceState(null,'',url);};
let model;try{model=(await new GLTFLoader().loadAsync('output/community_v1.glb?v=20')).scene;model.traverse(o=>{if(o.isMesh&&o.userData.landscape){o.material.polygonOffset=true;o.material.polygonOffsetFactor=-1;o.material.polygonOffsetUnits=-1;}});scene.add(model);document.querySelector('#status').textContent='本区 14 栋建筑＋沿街底商 · 实拍立面细化';}catch(e){document.querySelector('#status').textContent='模型载入失败';console.error(e);}
const query=new URLSearchParams(location.search);
if(query.has('building')){const i=Number(query.get('building'))-1;if([...select.options].some(o=>o.value===String(i))){select.value=String(i);focusBuilding();}}
const views={gate:{target:[3,3.2,44],offset:[25,5,17]},shops:{target:[-8,3,65],offset:[75,40,15]},garden:{target:[-53,0,-39],offset:[55,65,65]},'garage-main':{target:[-3,0,0],offset:[45,26,20]},'garage-secondary':{target:[-3,0,-84],offset:[45,26,20]}};
if(views[query.get('area')]){const v=views[query.get('area')];controls.target.set(...v.target);camera.position.copy(controls.target).add(new THREE.Vector3(...v.offset));}
if(query.get('view')==='top')overview(true);
if(query.get('sun')==='1')document.querySelector('#sun-enabled').checked=true;
const sunlight=model?setupSunlight({scene,renderer,sun,ambient,camera,controls,model,data,host}):null;
walk=model?setupWalk({camera,controls,host,canvas:renderer.domElement,data}):null;
let showLabels=false;document.querySelector('#labels').onchange=e=>{showLabels=e.target.checked;};
new ResizeObserver(()=>{camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();renderer.setSize(host.clientWidth,host.clientHeight);}).observe(host);
renderer.setAnimationLoop(t=>{sunlight?.tick(t);walk?.tick(t);if(!walk?.active)controls.update();camera.updateMatrixWorld();for(const {el,p} of labels){const v=p.clone().project(camera);el.style.display=!showLabels||v.z>1||v.z< -1?'none':'block';el.style.left=`${(v.x+1)*host.clientWidth/2}px`;el.style.top=`${(1-v.y)*host.clientHeight/2}px`;}renderer.render(scene,camera);});
window.__community={scene,camera,controls,get model(){return model;},data,sunlight,walk};
