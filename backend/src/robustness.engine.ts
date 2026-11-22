import type {PlanningInput} from './planning.engine';

/**
 * Deterministic two-factor stress test for a FIXED staffing decision.
 * Each of 25 deliberately selected cases receives equal descriptive weight.
 * These are NOT predicted probabilities, clinical thresholds, or a stochastic model.
 */
export type StressCase={
  demandDeltaPercent:number;
  productivityDeltaPercent:number;
  demand:number;
  visitsPerDoctor:number;
  baseShortfall:number;
  robustShortfall:number;
};
export type StressOption={
  doctors:number;
  coveredCases:number;
  coveragePercent:number;
  worstPlanningShortfall:number;
  meanPlanningShortfall:number;
  baselineShortfall:number;
  addedCostVnd:number;
};
export type RobustnessAssessment={
  demandDeltas:readonly number[];
  productivityDeltas:readonly number[];
  casesEvaluated:number;
  baseDoctors:number;
  robustDoctors:number;
  base:StressOption;
  robust:StressOption;
  options:StressOption[];
  cases:StressCase[];
  method:string;
  warnings:string[];
  synthetic:true;
  persisted:false;
};
type CaseInput={demand:number;visitsPerDoctor:number;demandDeltaPercent:number;productivityDeltaPercent:number};
const round1=(n:number)=>Math.round(n*10)/10;
function shortfall(doctors:number,c:CaseInput,targetUtilizationPercent:number):number{
  const capacity=Math.floor(doctors*c.visitsPerDoctor*targetUtilizationPercent/100);
  return Math.max(0,c.demand-capacity);
}
function stats(doctors:number,cases:CaseInput[],input:PlanningInput):StressOption{
  const misses=cases.map(c=>shortfall(doctors,c,input.targetUtilizationPercent));
  const coveredCases=misses.filter(v=>v===0).length;
  return {
    doctors,coveredCases,coveragePercent:round1(coveredCases*100/cases.length),
    worstPlanningShortfall:Math.max(...misses),
    meanPlanningShortfall:round1(misses.reduce((sum,v)=>sum+v,0)/cases.length),
    baselineShortfall:shortfall(doctors,{
      demand:input.demand,visitsPerDoctor:input.visitsPerDoctor,
      demandDeltaPercent:0,productivityDeltaPercent:0
    },input.targetUtilizationPercent),
    addedCostVnd:Math.max(0,doctors-input.currentDoctors)*input.extraDoctorCost
  };
}
/**
 * Risk-averse ranking: most stress cases covered, then lowest worst shortfall,
 * lowest mean shortfall, and finally lowest additional cost.
 * A human manager must choose whether this risk preference matches their goals.
 */
export function analyzeDecisionRobustness(input:PlanningInput,baseDoctors:number):RobustnessAssessment{
  if(!Number.isInteger(input.demand)||input.demand<0||input.demand>100000
    ||![input.currentDoctors,input.availableDoctors,input.rooms,input.visitsPerDoctor,
         input.extraDoctorCost,input.targetUtilizationPercent].every(Number.isInteger)
    ||input.currentDoctors<1||input.availableDoctors<1||input.availableDoctors>40
    ||input.rooms<1||input.rooms>40||input.visitsPerDoctor<1||input.visitsPerDoctor>200
    ||input.extraDoctorCost<0||input.extraDoctorCost>100000000
    ||input.targetUtilizationPercent<50||input.targetUtilizationPercent>100
    ||!Number.isInteger(baseDoctors)||baseDoctors<1
    ||baseDoctors>Math.min(input.availableDoctors,input.rooms)){
    throw new Error('Invalid robustness assumptions');
  }
  const demandDeltas=[-20,-10,0,10,20] as const;
  const productivityDeltas=[-20,-10,0,10,20] as const;
  const cases:CaseInput[]=demandDeltas.flatMap(demandDeltaPercent=>
    productivityDeltas.map(productivityDeltaPercent=>({
      demandDeltaPercent,productivityDeltaPercent,
      demand:Math.round(input.demand*(1+demandDeltaPercent/100)),
      visitsPerDoctor:Math.max(1,Math.round(input.visitsPerDoctor*(1+productivityDeltaPercent/100)))
    })));
  const maxDoctors=Math.min(input.availableDoctors,input.rooms);
  const options=Array.from({length:maxDoctors},(_,i)=>stats(i+1,cases,input));
  const ranked=[...options].sort((a,b)=>
    b.coveredCases-a.coveredCases
    ||a.worstPlanningShortfall-b.worstPlanningShortfall
    ||a.meanPlanningShortfall-b.meanPlanningShortfall
    ||a.addedCostVnd-b.addedCostVnd
    ||a.doctors-b.doctors);
  const robust=ranked[0];
  const base=options.find(v=>v.doctors===baseDoctors);
  if(!base||!robust)throw new Error('No feasible robustness options');
  const scenarioGrid=cases.map(c=>({
    ...c,
    baseShortfall:shortfall(baseDoctors,c,input.targetUtilizationPercent),
    robustShortfall:shortfall(robust.doctors,c,input.targetUtilizationPercent)
  }));
  const warnings=[
    '25 trường hợp thử là lưới giả định hai yếu tố (nhu cầu và năng suất ±20%), không phải phân phối xác suất hay khoảng tin cậy dự báo.',
    'Tỷ lệ bao phủ chỉ là tỷ lệ trường hợp trên lưới giả định; không được diễn giải thành xác suất phục vụ bệnh nhân.',
    'Xếp hạng thận trọng ưu tiên ít thiếu hụt trong lưới thử rồi mới xét chi phí; người quản lý phải xác nhận mức chấp nhận rủi ro.',
    'Không mô hình hóa chuyên khoa, mức độ nặng, ca trực, thiết bị, danh sách bệnh nhân hoặc an toàn lâm sàng.'
  ];
  return {
    demandDeltas,productivityDeltas,casesEvaluated:cases.length,
    baseDoctors,robustDoctors:robust.doctors,base,robust,
    options:ranked,cases:scenarioGrid,
    method:'Two-factor deterministic 5×5 grid: demand and assumed visits-per-doctor change independently by -20/-10/0/+10/+20 percent. Hold staff, room and target-utilization constraints fixed. Compare unchanged staffing choices across identical cases. Prefer most covered cases, smallest worst and mean shortfall, then smallest incremental cost. No probabilities, AI, persistence or clinical validation.',
    warnings,synthetic:true,persisted:false
  };
}
