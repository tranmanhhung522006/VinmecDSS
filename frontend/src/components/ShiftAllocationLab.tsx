import {useState,type FormEvent} from 'react';
import {ArrowRight,Download,ShieldAlert,SlidersHorizontal,Users} from 'lucide-react';
import {request} from '../lib/api';
import {downloadCsv} from '../utils/csv';

type WindowInput={name:string;demand:number;maxDoctors:number;rooms:number;visitsPerDoctor:number};
type AllocationInput={shifts:[WindowInput,WindowInput,WindowInput];doctorSlotBudget:number;currentDoctorSlots:number;costPerAdditionalSlotVnd:number;targetUtilizationPercent:number};
type Assignment={name:string;demand:number;doctors:number;plannedCapacity:number;physicalCapacity:number;plannedShortfall:number;physicalShortfall:number;unusedPlanningCapacity:number};
type Plan={assignments:Assignment[];totalDoctorSlots:number;totalDemand:number;plannedCapacity:number;plannedShortfall:number;physicalShortfall:number;addedSlots:number;addedCostVnd:number;coversAllWindows:boolean};
type Result={inputs:AllocationInput;feasibleCombinationCount:number;recommended:Plan;baseline:Plan;alternatives:Plan[];warnings:string[];method:string;synthetic:true;persisted:false};
const fmt=(n:number)=>new Intl.NumberFormat('vi-VN').format(n);
const vnd=(n:number)=>fmt(n)+' ₫';
const defaults:AllocationInput={
  shifts:[
    {name:'Sáng',demand:150,maxDoctors:6,rooms:6,visitsPerDoctor:30},
    {name:'Chiều',demand:90,maxDoctors:5,rooms:5,visitsPerDoctor:30},
    {name:'Tối',demand:30,maxDoctors:3,rooms:3,visitsPerDoctor:30}
  ],
  doctorSlotBudget:10,currentDoctorSlots:8,costPerAdditionalSlotVnd:300000,targetUtilizationPercent:100
};
export default function ShiftAllocationLab({token,onSaved}:{token:string;onSaved:()=>void}){
  const [inputs,setInputs]=useState<AllocationInput>(defaults);
  const [result,setResult]=useState<Result|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const [saving,setSaving]=useState(false);
  const setGlobal=(key:Exclude<keyof AllocationInput,'shifts'>,value:number)=>{
    setInputs(s=>({...s,[key]:value}));setResult(null);setError('');
  };
  const setShift=(index:number,key:Exclude<keyof WindowInput,'name'>,value:number)=>{
    setInputs(s=>({...s,shifts:s.shifts.map((row,i)=>i===index?{...row,[key]:value}:row) as AllocationInput['shifts']}));setResult(null);setError('');
  };
  async function calculate(event:FormEvent){
    event.preventDefault();if(loading)return;setLoading(true);setError('');
    try{setResult(await request<Result>('/public/shift-allocation','POST',inputs));}
    catch(e){setResult(null);setError(e instanceof Error?e.message:'Không thể phân bổ nguồn lực');}
    finally{setLoading(false);}
  }
  async function saveStudy(){
    if(!result||!token||saving)return;
    setSaving(true);setError('');
    try{
      await request('/studies','POST',{kind:'SHIFT',name:'Phân bổ ba ca · '+result.recommended.totalDemand+' lượt',input:inputs},token);
      onSaved();
    }catch(e){setError(e instanceof Error?e.message:'Không thể lưu hồ sơ');}
    finally{setSaving(false);}
  }
  function exportResults(){
    if(!result)return;
    const header=['Plan','Window','Demand','Doctor-shifts','Physical capacity','Planning capacity','Planning shortfall','Added cost VND'];
    const rows=[['Baseline',result.baseline],['Recommended',result.recommended]] as const;
    downloadCsv('vinmec-shift-allocation.csv',[header,...rows.flatMap(([name,plan])=>plan.assignments.map(a=>[
      name,a.name,a.demand,a.doctors,a.physicalCapacity,a.plannedCapacity,a.plannedShortfall,plan.addedCostVnd]))]);
  }
  return <div className="lab-shell shift-lab">
    <header className="card lab-intro">
      <div className="lab-intro-title"><span className="lab-icon"><SlidersHorizontal size={21}/></span><div>
        <div className="micro">MULTI-WINDOW ALLOCATION / DECISION INTELLIGENCE</div>
        <h2>Phân bổ bác sĩ-ca theo khung giờ</h2>
        <p>Mô phỏng nhu cầu và giới hạn nguồn lực ở ba khung ca. Tìm phương án có tổng thiếu hụt thấp nhất trong ngân sách bác sĩ-ca.</p>
      </div></div>
      <div className="lab-intro-note"><ShieldAlert size={16}/> Phân bổ tổng hợp · Không xếp lịch cá nhân</div>
    </header>
    <div className="lab-grid">
      <form className="card panel lab-form" onSubmit={calculate}>
        <div className="lab-section-title"><div><div className="micro">01 / GIỚI HẠN</div><h2>Nguồn lực tổng</h2></div>
          <button type="button" className="secondary" onClick={()=>{setInputs(defaults);setResult(null);setError('')}}>Đặt lại</button></div>
        <div className="lab-fields">
          <label className="field">Ngân sách bác sĩ-ca<input type="number" required min="0" max="60" value={inputs.doctorSlotBudget} onChange={e=>setGlobal('doctorSlotBudget',Number(e.target.value))}/></label>
          <label className="field">Bác sĩ-ca tham chiếu<input type="number" required min="0" max="60" value={inputs.currentDoctorSlots} onChange={e=>setGlobal('currentDoctorSlots',Number(e.target.value))}/></label>
          <label className="field">Chi phí mỗi ca tăng thêm (₫)<input type="number" required min="0" max="100000000" value={inputs.costPerAdditionalSlotVnd} onChange={e=>setGlobal('costPerAdditionalSlotVnd',Number(e.target.value))}/></label>
          <label className="field">Công suất mục tiêu (%)<input type="number" required min="50" max="100" value={inputs.targetUtilizationPercent} onChange={e=>setGlobal('targetUtilizationPercent',Number(e.target.value))}/></label>
        </div>
        <div className="micro shift-section-label">02 / THÔNG SỐ TỪNG CA</div>
        {inputs.shifts.map((row,i)=><section key={row.name} className="shift-input-group">
          <h3>{row.name}</h3>
          <div className="lab-fields">
            <label className="field">Nhu cầu (lượt)<input type="number" required min="0" max="100000" value={row.demand} onChange={e=>setShift(i,'demand',Number(e.target.value))}/></label>
            <label className="field">Bác sĩ tối đa<input type="number" required min="0" max="20" value={row.maxDoctors} onChange={e=>setShift(i,'maxDoctors',Number(e.target.value))}/></label>
            <label className="field">Phòng khám<input type="number" required min="0" max="20" value={row.rooms} onChange={e=>setShift(i,'rooms',Number(e.target.value))}/></label>
            <label className="field">Lượt / bác sĩ-ca<input type="number" required min="1" max="200" value={row.visitsPerDoctor} onChange={e=>setShift(i,'visitsPerDoctor',Number(e.target.value))}/></label>
          </div>
        </section>)}
        <div className="lab-preview"><span>Tổng nhu cầu theo ca</span><strong>{fmt(inputs.shifts.reduce((sum,s)=>sum+s.demand,0))} <small>lượt</small></strong></div>
        <button className="primary full" type="submit" disabled={loading}>{loading?'Đang tối ưu…':'Tìm phân bổ tối ưu'}<ArrowRight size={16}/></button>
        {error&&<p role="alert" className="lab-error">{error}</p>}
      </form>
      <div className="lab-results">
        {!result?<section className="card lab-empty"><Users size={34}/><h2>Phân bổ theo ba khung ca</h2><p>Nhập nhu cầu và giới hạn từng ca để tìm cách phân bổ bác sĩ-ca phù hợp.</p></section>:<>
          {token&&<div className="lab-study-action"><span>Mô phỏng chưa được lưu và chưa phê duyệt.</span><button className="primary" type="button" disabled={saving} onClick={()=>void saveStudy()}>{saving?'Đang lưu…':'Lưu hồ sơ chờ Manager duyệt'}</button></div>}
          <section className="lab-metrics">
            <div className="card"><span><Users size={15}/> Bác sĩ-ca đề xuất</span><strong>{result.recommended.totalDoctorSlots}</strong><small>Ngân sách tối đa {result.inputs.doctorSlotBudget} ca</small></div>
            <div className="card"><span>Tổng lượt thiếu</span><strong className={result.recommended.plannedShortfall?'lab-alert-number':''}>{fmt(result.recommended.plannedShortfall)}</strong><small>Trong cả ba khung ca</small></div>
            <div className="card"><span>Chi phí tăng</span><strong>{vnd(result.recommended.addedCostVnd)}</strong><small>Giả định theo bác sĩ-ca</small></div>
            <div className="card"><span>Phương án đã kiểm tra</span><strong>{fmt(result.feasibleCombinationCount)}</strong><small>Tất cả phân bổ hợp lệ</small></div>
          </section>
          <section className="card panel lab-analysis">
            <div className="panel-head"><div><div className="micro">03 / KẾT QUẢ</div><h2>Phân bổ đề xuất theo ca</h2></div><button type="button" className="secondary" onClick={exportResults}><Download size={15}/> Xuất CSV</button></div>
            <div className="lab-table-scroll"><table><thead><tr><th>Ca</th><th>Nhu cầu</th><th>Bác sĩ-ca</th><th>Công suất KH</th><th>Thiếu</th></tr></thead>
              <tbody>{result.recommended.assignments.map(a=><tr key={a.name}><td><strong>{a.name}</strong></td><td>{fmt(a.demand)}</td><td>{a.doctors}</td><td>{fmt(a.plannedCapacity)}</td><td className={a.plannedShortfall?'shift-alert':''}>{fmt(a.plannedShortfall)}</td></tr>)}</tbody></table></div>
            <p className="lab-caption">Mục tiêu: tối thiểu tổng thiếu hụt → chi phí ca bổ sung → số ca sử dụng. Đây là mô hình phân bổ tổng hợp, không xác định cá nhân bác sĩ làm việc vào ca nào.</p>
          </section>
          <section className="card panel lab-analysis">
            <div className="micro">04 / BASELINE COMPARISON</div><h2>Đánh đổi so với phân bổ tham chiếu</h2>
            <div className="shift-comparison"><div><small>PHÂN BỔ THAM CHIẾU</small><strong>{result.baseline.totalDoctorSlots} bác sĩ-ca</strong><span>Thiếu {fmt(result.baseline.plannedShortfall)} lượt</span></div>
              <div><small>PHƯƠNG ÁN TỐI ƯU</small><strong>{result.recommended.totalDoctorSlots} bác sĩ-ca</strong><span>Thiếu {fmt(result.recommended.plannedShortfall)} lượt</span></div></div>
            <p className="lab-caption">Tham chiếu là cách chia luân phiên bác sĩ-ca vào ba ca từ mức đầu vào; không phải lịch trực đang áp dụng tại bệnh viện.</p>
          </section>
          <section className="card panel lab-limitations"><div className="micro">GIỚI HẠN CỦA MÔ HÌNH</div>{result.warnings.map(w=><p key={w}><ShieldAlert size={15}/>{w}</p>)}</section>
        </>}
      </div>
    </div>
  </div>;
}
