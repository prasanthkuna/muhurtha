import { assert, assertEquals, assertThrows } from "jsr:@std/assert";
import { evaluateDay } from "./panchanga.ts";
Deno.test("rejects dates without real coordinates",()=>{
  assertThrows(()=>evaluateDay({date:"2026-10-20",zone:"Asia/Kolkata",latitude:NaN,longitude:72,purpose:"travel"}));
});
Deno.test("provides date-specific traditional factors and local windows",()=>{
  const r=evaluateDay({date:"2026-10-20",zone:"Asia/Kolkata",latitude:17.385,longitude:78.4867,purpose:"travel",natalNakshatra:"Ashwini",natalRashi:"Aries"});
  assertEquals(r.tithi.name,"Tithi");
  assert(r.nakshatra.value.length>0);
  assert(r.yoga.value.length>0);
  assert(r.karana.value.length>0);
  assert(r.caution_windows.some(w=>w.label==="Rahu Kalam"));
  assert(r.caution_windows.some(w=>w.label==="Yamagandam"));
  assert(r.caution_windows.some(w=>w.label==="Gulika"));
  assert(r.tithi.nextChange?.includes("+05:30"));
  assert(r.best_windows.every(w=>w.start < w.end));
});
Deno.test("date-specific factors change across days",()=>{
  const read=(date:string)=>evaluateDay({date,zone:"Asia/Kolkata",latitude:17.385,longitude:78.4867,purpose:"career_interview"});
  const a=read("2026-10-20"),b=read("2026-10-27");
  assert(a.tithi.value!==b.tithi.value || a.nakshatra.value!==b.nakshatra.value);
});
Deno.test("specialist activities cannot get unconditional auspicious status",()=>{
  const r=evaluateDay({date:"2026-10-20",zone:"Asia/Kolkata",latitude:17.385,longitude:78.4867,purpose:"property_vehicle",natalNakshatra:"Ashwini"});
  assertEquals(r.status,"limited_assessment");
});
