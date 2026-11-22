/**
 * Capacity planning engine (synthetic data only).
 * Exhaustive search is exact for the deliberately simple 1D staffing problem.
 * It is NOT an OR-Tools/CP-SAT solver or a validated clinical scheduling model.
 */
export type PlanningInput={
  demand:number;currentDoctors:number;availableDoctors:number;rooms:number;
  visitsPerDoctor:number;extraDoctorCost:number;targetUtilizationPercent:number;
};
export type PlanningOption={
  doctors:number;physicalCapacity:number;planningCapacity:number;
  physicalShortfall:number;planningShortfall:number;sparePlanningCapacity:number;
  addedCostVnd:number;utilizationPercent:number;coversPlanningTarget:boolean;
  withinCurrentRoster:boolean;recommended:boolean;
};
export type SensitivityRow={
  deltaPercent:number;demand:number;doctors:number;planningShortfall:number;addedCostVnd:number;
};
export type PlanningResult={
  inputs:PlanningInput;searchSpace:number;options:PlanningOption[];
  recommended:PlanningOption;current:PlanningOption|null;
  sensitivity:SensitivityRow[];warnings:string[];method:string;
  synthetic:true;persisted:false;
};
function integer(name:string,v:number,min:number,max:number):void{
  if(!Number.isInteger(v)||v<min||v>max)throw new Error('Invalid '+name);
}
function validate(i:PlanningInput){
  integer('demand',i.demand,0,100000);
  integer('currentDoctors',i.currentDoctors,1,40);
  integer('availableDoctors',i.availableDoctors,1,40);
  integer('rooms',i.rooms,1,40);
  integer('visitsPerDoctor',i.visitsPerDoctor,1,200);
  integer('extraDoctorCost',i.extraDoctorCost,0,100000000);
  integer('targetUtilizationPercent',i.targetUtilizationPercent,50,100);
}
function optionsFor(demand:number,i:PlanningInput):PlanningOption[]{
  return Array.from({length:Math.min(i.availableDoctors,i.rooms)},(_,idx)=>{
    const doctors=idx+1;
    const physicalCapacity=doctors*i.visitsPerDoctor;
    const planningCapacity=Math.floor(physicalCapacity*i.targetUtilizationPercent/100);
    return {
      doctors,physicalCapacity,planningCapacity,
      physicalShortfall:Math.max(0,demand-physicalCapacity),
      planningShortfall:Math.max(0,demand-planningCapacity),
      sparePlanningCapacity:Math.max(0,planningCapacity-demand),
      addedCostVnd:Math.max(0,doctors-i.currentDoctors)*i.extraDoctorCost,
      utilizationPercent:Math.round(demand/physicalCapacity*1000)/10,
      coversPlanningTarget:planningCapacity>=demand,
      withinCurrentRoster:doctors<=i.currentDoctors,
      recommended:false
    };
  });
}
/** Lexicographic objective: minimize unmet demand first; then additional cost; then doctors. */
function rank(a:PlanningOption,b:PlanningOption):number{
  return a.planningShortfall-b.planningShortfall
    ||a.addedCostVnd-b.addedCostVnd
    ||a.doctors-b.doctors
    ||a.sparePlanningCapacity-b.sparePlanningCapacity;
}
export function optimizeCapacity(input:PlanningInput):PlanningResult{
  validate(input);
  const options=optionsFor(input.demand,input);
  const winner=[...options].sort(rank)[0];
  if(!winner)throw new Error('No feasible staffing options');
  const rankedOptions=options.map(o=>({...o,recommended:o.doctors===winner.doctors}));
  const recommended=rankedOptions.find(o=>o.recommended)!;
  const current=rankedOptions.find(o=>o.doctors===input.currentDoctors)??null;
  const sensitivity=[-20,-10,0,10,20].map(deltaPercent=>{
    const demand=Math.round(input.demand*(1+deltaPercent/100));
    const choice=[...optionsFor(demand,input)].sort(rank)[0];
    return {deltaPercent,demand,doctors:choice.doctors,planningShortfall:choice.planningShortfall,addedCostVnd:choice.addedCostVnd};
  });
  const warnings:string[]=[];
  if(!current)warnings.push('Số bác sĩ hiện tại vượt giới hạn bác sĩ hoặc phòng đang cấu hình trong mô phỏng.');
  if(recommended.planningShortfall>0)warnings.push('Không phương án nào đáp ứng nhu cầu ở mức sử dụng mục tiêu; cần xem lại các giả định hoặc nguồn lực.');
  if(recommended.physicalShortfall>0)warnings.push('Ngay cả công suất vật lý giả định cũng chưa đáp ứng đủ nhu cầu.');
  if(input.targetUtilizationPercent<100)warnings.push('Mức sử dụng mục tiêu là tham số kế hoạch do người dùng đặt; không phải ngưỡng an toàn lâm sàng được kiểm chứng.');
  warnings.push('Năng suất, số phòng và chi phí là giả định tổng hợp; không bao gồm chuyên khoa, ca trực, thời gian chờ hay bệnh nhân thực.');
  return {inputs:input,searchSpace:options.length,options:rankedOptions,recommended,current,sensitivity,warnings,
    method:'Enumerate all integer staffing counts up to min(availableDoctors, rooms); rank by planned shortfall, incremental cost and staffing count. No external solver or AI alters numerical results.',
    synthetic:true,persisted:false};
}
