// Solar declination and equation-of-time approach adapted from
// building-sunlight-simulator (MIT; see licenses/building-sunlight-simulator.txt).
const RAD=Math.PI/180;
export function dayOfYear(date){
 const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(date);if(!m)throw new Error('请选择有效日期');
 const [y,month,d]=m.slice(1).map(Number),t=new Date(Date.UTC(y,month-1,d));
 if(t.getUTCFullYear()!==y||t.getUTCMonth()!==month-1||t.getUTCDate()!==d)throw new Error('请选择有效日期');
 return (t-Date.UTC(y,0,0))/86400000;
}
// Local civil time is explicitly UTC+8, independent of the browser's time zone.
export function solarPosition({date,hour,latitude=36.65,longitude=117.12,northAngle=0}){
 if(!Number.isFinite(hour)||hour<0||hour>24||!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180||!Number.isFinite(northAngle))throw new Error('经纬度或时间无效');
 const n=dayOfYear(date),g=2*Math.PI*(n-1)/365;
 const equation=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
 const dec=23.45*Math.sin(360*(284+n)/365*RAD)*RAD;
 const solarHour=hour+(4*longitude-480+equation)/60,h=(solarHour-12)*15*RAD,lat=latitude*RAD;
 const east=-Math.cos(dec)*Math.sin(h),up=Math.sin(lat)*Math.sin(dec)+Math.cos(lat)*Math.cos(dec)*Math.cos(h);
 const south=Math.sin(lat)*Math.cos(dec)*Math.cos(h)-Math.cos(lat)*Math.sin(dec);
 const a=northAngle*RAD;
 return {altitude:Math.asin(Math.max(-1,Math.min(1,up)))/RAD,azimuth:(Math.atan2(east,-south)/RAD+360)%360,solarHour,direction:[east*Math.cos(a)-south*Math.sin(a),up,east*Math.sin(a)+south*Math.cos(a)]};
}
export function clockLabel(minutes){const m=Math.round(minutes);return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
export function dailyExposure(settings,isLit,step=10){
 if(!Number.isInteger(step)||step<=0||1440%step)throw new Error('Invalid sampling interval');
 const intervals=[];let minutes=0;
 for(let m=0;m<1440;m+=step){const sun=solarPosition({...settings,hour:(m+step/2)/60});
  if(sun.altitude>0&&isLit(sun.direction)){minutes+=step;const last=intervals.at(-1);if(last&&last[1]===m)last[1]=m+step;else intervals.push([m,m+step]);}
 }
 return {hours:minutes/60,intervals,step};
}
// Find civil-day daylight periods using the same altitude model as shadows.
// Multiple periods are possible near the date boundary with unusual longitudes.
export function daylightPeriods(settings){
 const altitude=m=>solarPosition({...settings,hour:m/60}).altitude;
 function crossing(a,b){let sign=altitude(a)>0;for(let i=0;i<22;i++){const mid=(a+b)/2;if((altitude(mid)>0)===sign)a=mid;else b=mid;}return (a+b)/2;}
 const periods=[];let previous=altitude(0)>0,start=previous?0:null;
 for(let m=5;m<=1440;m+=5){const current=altitude(m)>0;
  if(current!==previous){const at=crossing(m-5,m);if(current)start=at;else{periods.push([start,at]);start=null;}}
  previous=current;
 }
 if(start!==null)periods.push([start,1440]);return periods;
}
