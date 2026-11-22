/**
 * Three-window staffing allocator for synthetic outpatient aggregate demand.
 * A "doctor-slot" is a planning unit for ONE window, not a unique person.
 * This is not a rota, personnel scheduling or medically validated throughput model.
 */
export type ShiftInput={
  name:string;
  demand:number;
  maxDoctors:number;
  rooms:number;
  visitsPerDoctor:number;
};
export type ShiftPlanningInput={
  shifts:[ShiftInput,ShiftInput,ShiftInput];
  doctorSlotBudget:number;
  currentDoctorSlots:number;
  costPerAdditionalSlotVnd:number;
  targetUtilizationPercent:number;
};
export type ShiftAssignment={
  name:string;demand:number;doctors:number;
  plannedCapacity:number;physicalCapacity:number;
  plannedShortfall:number;physicalShortfall:number;
  unusedPlanningCapacity:number;
};
export type ShiftPlan={
  assignments:ShiftAssignment[];
  totalDoctorSlots:number;totalDemand:number;plannedCapacity:number;
  plannedShortfall:number;physicalShortfall:number;
  addedSlots:number;addedCostVnd:number;coversAllWindows:boolean;
};
export type ShiftPlanningResult={
  inputs:ShiftPlanningInput;
  feasibleCombinationCount:number;
  recommended:ShiftPlan;
  alternatives:ShiftPlan[];
  baseline:ShiftPlan;
  warnings:string[];
  method:string;
  synthetic:true;persisted:false;
};
const int=(name:string,value:number,min:number,max:number)=>{
  if(!Number.isInteger(value)||value<min||value>max)throw new Error('Invalid '+name);
};
function check(input:ShiftPlanningInput){
  if(!Array.isArray(input.shifts)||input.shifts.length!==3)throw new Error('Exactly three planning windows required');
  int('doctorSlotBudget',input.doctorSlotBudget,0,60);
  int('currentDoctorSlots',input.currentDoctorSlots,0,60);
  int('costPerAdditionalSlotVnd',input.costPerAdditionalSlotVnd,0,100000000);
  int('targetUtilizationPercent',input.targetUtilizationPercent,50,100);
  for(const [i,s] of input.shifts.entries()){
    if(typeof s.name!=='string'||!s.name.trim()||s.name.length>50)throw new Error('Invalid shift '+i+' name');
    int('demand',s.demand,0,100000);
    int('maxDoctors',s.maxDoctors,0,20);
    int('rooms',s.rooms,0,20);
    int('visitsPerDoctor',s.visitsPerDoctor,1,200);
  }
}
function makePlan(i:ShiftPlanningInput,allocation:number[]):ShiftPlan{
  const assignments=i.shifts.map((s,idx)=>{
    const doctors=allocation[idx];
    const physicalCapacity=doctors*s.visitsPerDoctor;
    const plannedCapacity=Math.floor(physicalCapacity*i.targetUtilizationPercent/100);
    return {name:s.name,demand:s.demand,doctors,physicalCapacity,plannedCapacity,
      plannedShortfall:Math.max(0,s.demand-plannedCapacity),
      physicalShortfall:Math.max(0,s.demand-physicalCapacity),
      unusedPlanningCapacity:Math.max(0,plannedCapacity-s.demand)};
  });
  const totalDoctorSlots=allocation.reduce((a,b)=>a+b,0);
  const plannedShortfall=assignments.reduce((a,b)=>a+b.plannedShortfall,0);
  return {
    assignments,totalDoctorSlots,
    totalDemand:assignments.reduce((a,b)=>a+b.demand,0),
    plannedCapacity:assignments.reduce((a,b)=>a+b.plannedCapacity,0),
    plannedShortfall,
    physicalShortfall:assignments.reduce((a,b)=>a+b.physicalShortfall,0),
    addedSlots:Math.max(0,totalDoctorSlots-i.currentDoctorSlots),
    addedCostVnd:Math.max(0,totalDoctorSlots-i.currentDoctorSlots)*i.costPerAdditionalSlotVnd,
    coversAllWindows:plannedShortfall===0
  };
}
function compare(a:ShiftPlan,b:ShiftPlan){
  return a.plannedShortfall-b.plannedShortfall
    ||a.addedCostVnd-b.addedCostVnd
    ||a.totalDoctorSlots-b.totalDoctorSlots
    ||a.physicalShortfall-b.physicalShortfall
    ||a.assignments[0].doctors-b.assignments[0].doctors
    ||a.assignments[1].doctors-b.assignments[1].doctors;
}
/**
 * Exact enumeration over up to 21^3 allocations with a total doctor-slot cap.
 * A single doctor working twice is counted as two slots; no staff identities,
 * rest requirements, clinical cases or shift overlap are inferred.
 */
export function optimizeShiftAllocation(input:ShiftPlanningInput):ShiftPlanningResult{
  check(input);
  const limits=input.shifts.map(s=>Math.min(s.maxDoctors,s.rooms,input.doctorSlotBudget));
  const feasible:ShiftPlan[]=[];
  for(let morning=0;morning<=limits[0];morning++)
    for(let afternoon=0;afternoon<=limits[1];afternoon++)
      for(let evening=0;evening<=limits[2];evening++){
        if(morning+afternoon+evening>input.doctorSlotBudget)continue;
        feasible.push(makePlan(input,[morning,afternoon,evening]));
      }
  feasible.sort(compare);
  const recommended=feasible[0];
  if(!recommended)throw new Error('No feasible shift allocation');
  // Baseline is a deliberately simple equally distributed feasible allocation,
  // not a stored hospital roster.
  const reference=[0,0,0];
  let remaining=Math.min(input.currentDoctorSlots,input.doctorSlotBudget);
  while(remaining>0){
    let progressed=false;
    for(let k=0;k<3;k++){
      if(remaining>0&&reference[k]<limits[k]){reference[k]++;remaining--;progressed=true;}
    }
    if(!progressed)break;
  }
  const baseline=makePlan(input,reference);
  const warnings=[
    'Đơn vị nhân sự là bác sĩ-ca; một bác sĩ làm hai ca tính thành hai đơn vị, không phải hai bác sĩ khác nhau.',
    'Chưa có phân bổ nhân sự định danh, giới hạn giờ làm, luật lao động, chuyên khoa hoặc thời gian chờ.',
    'Chi phí chỉ tính số bác sĩ-ca tăng so với mức giả định hiện tại; không phản ánh lương, trực, phụ cấp hay chi phí thực.',
    'Lựa chọn tối ưu theo tổng lượt thiếu, chi phí tăng và tổng bác sĩ-ca; không xác lập ngưỡng an toàn lâm sàng.'
  ];
  if(recommended.plannedShortfall>0)warnings.unshift('Không tìm thấy phương án đáp ứng toàn bộ nhu cầu trong ngân sách bác sĩ-ca và giới hạn phòng khám.');
  if(input.currentDoctorSlots>input.doctorSlotBudget)warnings.push('Mức nhân sự-ca hiện tại lớn hơn ngân sách mô phỏng; phương án tham chiếu đã bị giới hạn bởi ngân sách.');
  return {inputs:input,feasibleCombinationCount:feasible.length,
    recommended,alternatives:feasible.slice(0,6),baseline,warnings,
    method:'Bounded integer enumeration of three planning windows. For each window, assigned doctors <= available doctors and rooms; sum of assigned doctor-shifts <= total slot budget. Rank by total planned shortfall, added variable cost and total slots. No stochastic probabilities or AI-driven numeric recommendations.',
    synthetic:true,persisted:false};
}
