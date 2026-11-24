/** Deterministic DSS calculations. All inputs are SYNTHETIC assumptions. */
export type Alternative = {
  doctors: number; capacity: number; gap: number; surplus: number;
  utilizationPercent: number; addedCostVnd: number; eligible: boolean;
  servesDemand: boolean; score: number; reason: string;
};
export type Assumptions = {
  currentDoctors: number; availableDoctors: number; rooms: number;
  visitsPerDoctor: number; extraDoctorCost: number;
};
export function computeDemand(baseline: number, growthPercent: number): number {
  if (!Number.isFinite(baseline) || baseline < 0 || !Number.isFinite(growthPercent) || growthPercent < -100 || growthPercent > 300) throw new Error('Invalid demand assumptions');
  return Math.round(baseline * (1 + growthPercent / 100));
}
export function compareAlternatives(demand: number, assumptions: Assumptions): {alternatives: Alternative[]; recommended: Alternative | null; criteria: string} {
  const {currentDoctors,availableDoctors,rooms,visitsPerDoctor,extraDoctorCost} = assumptions;
  if (![currentDoctors, availableDoctors, rooms, visitsPerDoctor, extraDoctorCost].every(Number.isFinite)
     || currentDoctors < 1 || availableDoctors < currentDoctors || rooms < 1 || visitsPerDoctor < 1 || extraDoctorCost < 0 || demand < 0) {
    throw new Error('Invalid resource assumptions');
  }
  const alternatives: Alternative[] = Array.from({length: 3},(_,i) => currentDoctors+i).map(doctors => {
    const eligible = doctors <= availableDoctors && doctors <= rooms;
    const capacity = doctors*visitsPerDoctor;
    const gap = Math.max(0,demand-capacity);
    const surplus = Math.max(0,capacity-demand);
    const addedCostVnd = (doctors-currentDoctors)*extraDoctorCost;
    const servesDemand = gap === 0;
    // Illustrative transparent scoring: heavy shortfall penalty; cost and overcapacity penalties.
    // Eligibility is a hard constraint; viable options rank above those with a shortfall.
    const shortageRatio = gap / Math.max(1,demand);
    const overcapacityRatio = surplus / Math.max(1,demand);
    const score = Math.max(0,Math.round((100 - 350*shortageRatio - 10*(doctors-currentDoctors) - 10*overcapacityRatio)*10)/10);
    const reason = !eligible ? 'Exceeds doctor availability or room limit'
      : !servesDemand ? `Capacity shortage: ${gap} visits`
      : `Demand covered; incremental staffing cost: ${addedCostVnd.toLocaleString('en-US')} VND`;
    return {doctors,capacity,gap,surplus,utilizationPercent:Math.round(demand/Math.max(1,capacity)*1000)/10,addedCostVnd,eligible,servesDemand,score,reason};
  });
  const ranked = alternatives.filter(a=>a.eligible).sort((a,b)=>Number(b.servesDemand)-Number(a.servesDemand) || b.score-a.score || a.addedCostVnd-b.addedCostVnd);
  return {alternatives,recommended:ranked[0] ?? null,criteria:'Hard constraints: doctor availability and clinic rooms. Prefer demand-covered alternatives, then score = 100 − 350 × gap/demand − 10 × extra doctors − 10 × surplus/demand.'};
}
type DailyVisits = {day:Date;visits:number};
type ForecastResult = {predictedVisits:number;trainingDays:number;model:string;explanation:string};

/** Return the exact daily aggregates selected by the forecasting algorithm, not a second query. */
export function forecastByWeekdayWithEvidence(targetDay: Date, visits: DailyVisits[]): ForecastResult & {sample:Array<{day:string;visits:number}>} {
  const history=visits.filter(v=>v.day.getTime() < targetDay.getTime()).sort((a,b)=>b.day.getTime()-a.day.getTime());
  if(history.length===0) throw new Error('No historical data');
  const weekday=history.filter(v=>v.day.getUTCDay()===targetDay.getUTCDay()).slice(0,4);
  const sample=weekday.length>=2 ? weekday : history.slice(0,7);
  return {
    predictedVisits:Math.round(sample.reduce((s,v)=>s+v.visits,0)/sample.length),
    trainingDays: sample.length,
    sample: sample.map(v=>({day:v.day.toISOString().slice(0,10),visits:v.visits})),
    model: weekday.length>=2 ? 'WEEKDAY_MEAN_4' : 'MOVING_AVERAGE_7',
    explanation:weekday.length>=2 ? 'Average of up to four previous matching weekdays' : 'Mean of up to seven most recent recorded days'
  };
}

/** Keep the legacy result contract for existing forecast runs and backtests. */
export function forecastByWeekday(targetDay:Date, visits:DailyVisits[]):ForecastResult {
  const {predictedVisits,trainingDays,model,explanation}=forecastByWeekdayWithEvidence(targetDay,visits);
  return {predictedVisits,trainingDays,model,explanation};
}
