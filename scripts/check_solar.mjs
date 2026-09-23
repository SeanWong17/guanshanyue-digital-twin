import assert from 'node:assert/strict';
import {solarPosition,dailyExposure,dayOfYear,daylightPeriods} from '../solar.js';
const base={date:'2026-03-20',latitude:36.65,longitude:117.12,northAngle:0};
const am=solarPosition({...base,hour:9}),pm=solarPosition({...base,hour:15}),night=solarPosition({...base,hour:0});
assert(am.direction[0]>0&&pm.direction[0]<0,'Morning east, afternoon west');assert(night.altitude<0);
const winter=solarPosition({...base,date:'2026-12-22',hour:12}),summer=solarPosition({...base,date:'2026-06-21',hour:12});assert(summer.altitude>winter.altitude+40);assert(winter.direction[2]>0,'Winter noon sun is south');
const turned=solarPosition({...base,hour:9,northAngle:90});assert(Math.abs(turned.direction[0]+am.direction[2])<1e-8);assert(Math.abs(turned.direction[2]-am.direction[0])<1e-8);
assert.equal(dayOfYear('2024-03-01'),61);assert.throws(()=>dayOfYear('2026-02-30'));
const clear=dailyExposure(base,()=>true),blocked=dailyExposure(base,()=>false);assert(clear.hours>11&&clear.hours<13);assert.equal(blocked.hours,0);assert.equal(blocked.intervals.length,0);
const shaded=dailyExposure(base,d=>d[0]>0);assert(shaded.hours>4&&shaded.hours<8);
console.log({morningAzimuth:am.azimuth,winterAltitude:winter.altitude,summerAltitude:summer.altitude,clearHours:clear.hours,blockedHours:blocked.hours});

const daylight=daylightPeriods(base);assert.equal(daylight.length,1);assert(daylight[0][0]>300&&daylight[0][1]<1200);for(const m of daylight[0])assert(Math.abs(solarPosition({...base,hour:m/60}).altitude)<.00001);assert.equal(daylightPeriods({...base,latitude:90,date:'2026-12-22'}).length,0);assert.deepEqual(daylightPeriods({...base,latitude:90,date:'2026-06-21'}),[[0,1440]]);console.log({daylight});
