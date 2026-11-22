import {useEffect,useState,type FormEvent} from 'react';
import {Activity,ArrowRight,Download,RefreshCw,ShieldAlert,SlidersHorizontal,Target,TrendingUp,Users} from 'lucide-react';
import {Bar,BarChart,CartesianGrid,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {request} from '../lib/api';
import {downloadCsv} from '../utils/csv';

type Department={activeDoctors:number;availableDoctors:number;rooms:number;visitsPerDoctor:number;extraDoctorCost:number};
type Inputs={baselineDemand:number;growthPercent:number;targetUtilizationPercent:number;availableDoctors:number;rooms:number;visitsPerDoctor:number;extraDoctorCost:number};
type Option={doctors:number;physicalCapacity:number;planningCapacity:number;physicalShortfall:number;planningShortfall:number;sparePlanningCapacity:number;addedCostVnd:number;utilizationPercent:number;coversPlanningTarget:boolean;withinCurrentRoster:boolean;recommended:boolean};
type StressOption={doctors:number;coveredCases:number;coveragePercent:number;worstPlanningShortfall:number;meanPlanningShortfall:number;baselineShortfall:number;addedCostVnd:number};
type StressCase={demandDeltaPercent:number;productivityDeltaPercent:number;demand:number;visitsPerDoctor:number;baseShortfall:number;robustShortfall:number};
type Robustness={baseDoctors:number;robustDoctors:number;base:StressOption;robust:StressOption;cases:StressCase[];options:StressOption[];casesEvaluated:number;warnings:string[];method:string};
type Result={inputs:Inputs&{demand:number;currentDoctors:number};options:Option[];recommended:Option;current:Option|null;sensitivity:{deltaPercent:number;demand:number;doctors:number;planningShortfall:number;addedCostVnd:number}[];warnings:string[];searchSpace:number;method:string;robustness:Robustness;synthetic:true;persisted:false};
const fmt=(v:number)=>new Intl.NumberFormat('vi-VN').format(v);
const currency=(v:number)=>fmt(v)+' ₫';
export default function CapacityPlanningLab({department}:{department:Department|null}){
  const [form,setForm]=useState<Inputs>({baselineDemand:200,growthPercent:30,targetUtilizationPercent:100,availableDoctors:10,rooms:10,visitsPerDoctor:30,extraDoctorCost:900000});
  const [dirty,setDirty]=useState(false);
  const [result,setResult]=useState<Result|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  useEffect(()=>{if(department&&!dirty)setForm(previous=>({...previous,
    availableDoctors:department.availableDoctors,rooms:department.rooms,
    visitsPerDoctor:department.visitsPerDoctor,extraDoctorCost:department.extraDoctorCost}));
  },[department,dirty]);
  function field(key:keyof Inputs,value:number){
    setForm(previous=>({...previous,[key]:value}));
    setDirty(true);setResult(null);setError('');
  }
  async function evaluate(e?:FormEvent){
    e?.preventDefault();setLoading(true);setError('');
    try{const data=await request<Result>('/public/capacity-lab','POST',form);setResult(data);}
    catch(err){setResult(null);setError(err instanceof Error?err.message:'Không thể tính mô phỏng.');}
    finally{setLoading(false);}
  }
  function reset(){
    if(!department)return;
    setForm({baselineDemand:200,growthPercent:30,targetUtilizationPercent:100,
      availableDoctors:department.availableDoctors,rooms:department.rooms,
      visitsPerDoctor:department.visitsPerDoctor,extraDoctorCost:department.extraDoctorCost});
    setDirty(false);setResult(null);setError('');
  }
  function exportCsv(){
    if(!result)return;
    const header=['Doctors','Physical capacity','Planning capacity','Planning shortfall','Physical shortfall','Added cost VND','Utilization %','Recommended'];
    const rows=result.options.map(o=>[o.doctors,o.physicalCapacity,o.planningCapacity,o.planningShortfall,o.physicalShortfall,o.addedCostVnd,o.utilizationPercent,o.recommended?'Yes':'No']);
    downloadCsv('vinmec-capacity-planning.csv',[header,...rows]);
    const robustHeader=['Demand variation %','Productivity variation %','Demand','Visits per doctor','Baseline doctors','Baseline shortfall','Robust doctors','Robust shortfall'];
    const robustRows=result.robustness.cases.map(c=>[c.demandDeltaPercent,c.productivityDeltaPercent,c.demand,c.visitsPerDoctor,result.robustness.baseDoctors,c.baseShortfall,result.robustness.robustDoctors,c.robustShortfall]);
    downloadCsv('vinmec-decision-stress-test.csv',[robustHeader,...robustRows]);
  }
  const projection=Math.round(form.baselineDemand*(1+form.growthPercent/100));
  return <div className="lab-shell">
    <header className="card lab-intro"><div className="lab-intro-title"><span className="lab-icon"><SlidersHorizontal size={21}/></span><div><span className="micro">CAPACITY PLANNING LAB / DECISION INTELLIGENCE</span><h2>Phòng mô phỏng nguồn lực ngoại trú</h2><p>Khám phá toàn bộ phương án nhân sự trong giới hạn bác sĩ, phòng khám và mức công suất mục tiêu.</p></div></div><div className="lab-intro-note"><ShieldAlert size={16}/> Kịch bản giả lập · Không lưu · Không phê duyệt tự động</div></header>
    <div className="lab-grid">
      <form className="card panel lab-form" onSubmit={evaluate}>
        <div className="lab-section-title"><div><div className="micro">01 / ĐẦU VÀO</div><h2>Thiết lập giả định</h2></div><button type="button" className="secondary lab-reset" onClick={reset} disabled={!department||loading}><RefreshCw size={14}/> Đặt lại</button></div>
        <div className="lab-fields">
          <label className="field">Nhu cầu cơ sở (lượt/ngày)<input type="number" min="0" max="100000" step="1" required value={form.baselineDemand} onChange={e=>field('baselineDemand',Number(e.target.value))}/></label>
          <label className="field">Biến động nhu cầu (%)<input type="number" min="-100" max="300" step="1" required value={form.growthPercent} onChange={e=>field('growthPercent',Number(e.target.value))}/></label>
          <label className="field">Bác sĩ khả dụng<input type="number" min="1" max="40" step="1" required value={form.availableDoctors} onChange={e=>field('availableDoctors',Number(e.target.value))}/></label>
          <label className="field">Phòng khám khả dụng<input type="number" min="1" max="40" step="1" required value={form.rooms} onChange={e=>field('rooms',Number(e.target.value))}/></label>
          <label className="field">Năng suất giả định (lượt/bác sĩ/ngày)<input type="number" min="1" max="200" step="1" required value={form.visitsPerDoctor} onChange={e=>field('visitsPerDoctor',Number(e.target.value))}/></label>
          <label className="field">Chi phí cho bác sĩ bổ sung (₫)<input type="number" min="0" max="100000000" step="1" required value={form.extraDoctorCost} onChange={e=>field('extraDoctorCost',Number(e.target.value))}/></label>
        </div>
        <label className="field lab-range"><span>Giới hạn sử dụng công suất mục tiêu <strong>{form.targetUtilizationPercent}%</strong></span><input aria-label="Mức sử dụng công suất mục tiêu" type="range" min="50" max="100" step="5" value={form.targetUtilizationPercent} onChange={e=>field('targetUtilizationPercent',Number(e.target.value))}/><small>Tham số lập kế hoạch, không phải ngưỡng an toàn lâm sàng.</small></label>
        <div className="lab-preview"><span>Nhu cầu mô phỏng</span><strong>{fmt(projection)} <small>lượt/ngày</small></strong></div>
        <button type="submit" disabled={loading||!department} className="primary full">{loading?'Đang tính phương án…':'Tính và so sánh tất cả phương án'}<ArrowRight size={16}/></button>
        {error&&<p className="lab-error" role="alert">{error}</p>}
      </form>
      <section className="lab-results">
        {!result?<div className="card lab-empty"><Target size={36}/><h2>Không gian phân tích What-if</h2><p>Điều chỉnh các giả định rồi chạy mô phỏng. Kết quả được tính tại backend, không sử dụng AI để tự tạo số liệu và không ghi vào hồ sơ quyết định.</p><div className="lab-empty-steps"><span>01. Nhập giả định</span><span>02. Xếp hạng phương án</span><span>03. Kiểm tra độ nhạy</span></div></div>:<>
          <div className="lab-metrics">
            <div className="card"><span><Users size={15}/> Bác sĩ đề xuất</span><strong>{result.recommended.doctors}</strong><small>Giới hạn {Math.min(result.inputs.availableDoctors,result.inputs.rooms)} người</small></div>
            <div className="card"><span><Activity size={15}/> Công suất kế hoạch</span><strong>{fmt(result.recommended.planningCapacity)}</strong><small>Lượt khám/ngày theo giả định</small></div>
            <div className="card"><span><ShieldAlert size={15}/> Nhu cầu chưa đáp ứng</span><strong className={result.recommended.planningShortfall?'lab-alert-number':''}>{fmt(result.recommended.planningShortfall)}</strong><small>Lượt vượt công suất mục tiêu</small></div>
            <div className="card"><span><TrendingUp size={15}/> Chi phí bổ sung</span><strong>{fmt(result.recommended.addedCostVnd)}</strong><small>VND / ngày giả định</small></div>
          </div>
          <section className="card panel lab-analysis">
            <div className="panel-head"><div><div className="micro">02 / PHƯƠNG ÁN</div><h2>Phân bổ công suất</h2><p className="muted">{result.searchSpace} mức nhân sự hợp lệ đã được đánh giá. Đường công suất kế hoạch phản ánh mức sử dụng mục tiêu.</p></div><button type="button" className="secondary" onClick={exportCsv}><Download size={15}/> CSV</button></div>
            <div className="lab-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={result.options} margin={{top:10,right:12,left:-16,bottom:0}}><CartesianGrid vertical={false} stroke="#e9edf0"/><XAxis dataKey="doctors" tick={{fontSize:11,fill:'#758796'}} axisLine={false} tickLine={false} label={{value:'Số bác sĩ',position:'insideBottom',offset:-2,fontSize:10}}/><YAxis tick={{fontSize:11,fill:'#758796'}} axisLine={false} tickLine={false}/><Tooltip formatter={v=>fmt(Number(v))+' lượt'}/><Legend wrapperStyle={{fontSize:11,paddingTop:8}}/><Bar dataKey="physicalCapacity" name="Công suất vật lý" fill="#c0cbd3" radius={[3,3,0,0]}/><Bar dataKey="planningCapacity" name="Công suất kế hoạch" fill="#29748a" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></div>
            <div className="lab-table-scroll"><table><thead><tr><th>Bác sĩ</th><th>Công suất KH</th><th>Thiếu</th><th>Chi phí tăng</th><th>Đánh giá</th></tr></thead><tbody>{result.options.map(o=><tr key={o.doctors} className={o.recommended?'lab-selected':''}><td><strong>{o.doctors}</strong></td><td>{fmt(o.planningCapacity)}</td><td>{fmt(o.planningShortfall)}</td><td>{currency(o.addedCostVnd)}</td><td>{o.recommended?<span className="lab-status">Ưu tiên</span>:o.coversPlanningTarget?'Đủ':'Thiếu'}</td></tr>)}</tbody></table></div>
            <p className="lab-caption">Ưu tiên ít thiếu hụt nhất → chi phí bổ sung thấp nhất → ít bác sĩ nhất. Đây là quy tắc lập kế hoạch minh bạch, không phải tối ưu lịch trực lâm sàng.</p>
          </section>
          <section className="card panel lab-analysis"><div className="micro">03 / PHÂN TÍCH ĐỘ NHẠY</div><h2>Nếu nhu cầu thay đổi?</h2><p className="muted">Tính lại phương án tại năm mức nhu cầu, giữ nguyên những giả định nguồn lực.</p><div className="lab-table-scroll"><table><thead><tr><th>Thay đổi</th><th>Nhu cầu</th><th>Bác sĩ đề xuất</th><th>Thiếu hụt KH</th></tr></thead><tbody>{result.sensitivity.map(s=><tr key={s.deltaPercent}><td>{s.deltaPercent>0?'+':''}{s.deltaPercent}%</td><td>{fmt(s.demand)}</td><td>{s.doctors}</td><td>{fmt(s.planningShortfall)}</td></tr>)}</tbody></table></div></section>
          <section className="card panel lab-analysis lab-robustness">
            <div className="panel-head"><div><div className="micro">04 / DECISION ROBUSTNESS</div><h2>Độ bền của quyết định trước biến động</h2><p className="muted">Stress test 25 trường hợp: nhu cầu và năng suất bác sĩ cùng dao động từ −20% tới +20%. Các trường hợp không có trọng số xác suất.</p></div><span className="dss-tag blue">5 × 5 trường hợp</span></div>
            <div className="lab-robust-grid">
              <div className="lab-robust-option"><small>PHƯƠNG ÁN CƠ SỞ · TỐI ƯU CHI PHÍ</small><strong>{result.robustness.base.doctors} bác sĩ</strong><span>Bao phủ {result.robustness.base.coveredCases}/25 trường hợp</span><span>Thiếu cao nhất: <b>{fmt(result.robustness.base.worstPlanningShortfall)} lượt</b></span><span>Chi phí tăng: <b>{currency(result.robustness.base.addedCostVnd)}</b></span></div>
              <div className="lab-robust-option lab-robust-conservative"><small>PHƯƠNG ÁN THẬN TRỌNG · ƯU TIÊN GIẢM THIẾU HỤT</small><strong>{result.robustness.robust.doctors} bác sĩ</strong><span>Bao phủ {result.robustness.robust.coveredCases}/25 trường hợp</span><span>Thiếu cao nhất: <b>{fmt(result.robustness.robust.worstPlanningShortfall)} lượt</b></span><span>Chi phí tăng: <b>{currency(result.robustness.robust.addedCostVnd)}</b></span></div>
            </div>
            <p className="lab-caption">Chênh lệch chi phí bổ sung: {currency(result.robustness.robust.addedCostVnd-result.robustness.base.addedCostVnd)}. Kết quả thận trọng là góc nhìn khác, không tự thay thế phương án cơ sở hoặc quyết định của Manager.</p>
            <h3 className="lab-subheading">Ma trận thiếu hụt khi giữ nguyên {result.robustness.baseDoctors} bác sĩ cơ sở</h3>
            <div className="lab-table-scroll"><table className="lab-stress-matrix"><thead><tr><th>Nhu cầu / Năng suất</th>{[-20,-10,0,10,20].map(p=><th key={p}>{p>0?'+':''}{p}%</th>)}</tr></thead><tbody>{[-20,-10,0,10,20].map(d=><tr key={d}><th scope="row">{d>0?'+':''}{d}%</th>{[-20,-10,0,10,20].map(p=>{const row=result.robustness.cases.find(c=>c.demandDeltaPercent===d&&c.productivityDeltaPercent===p);return <td key={p} className={row?.baseShortfall?'lab-stress-alert':'lab-stress-ok'} title={row?'Nhu cầu '+row.demand+' · năng suất '+row.visitsPerDoctor+'/bác sĩ':''}>{row?fmt(row.baseShortfall):'—'}</td>})}</tr>)}</tbody></table></div>
            <p className="lab-caption">Mỗi ô là số lượt thiếu so với công suất kế hoạch của phương án cơ sở; 0 nghĩa là đáp ứng được nhu cầu giả định trong trường hợp đó. Tải CSV để xem cả hai phương án.</p>
            <div className="lab-robust-notes">{result.robustness.warnings.map(w=><p key={w}><ShieldAlert size={14}/>{w}</p>)}</div>
          </section>
          <section className="card panel lab-limitations"><div className="micro">GIẢ ĐỊNH VÀ GIỚI HẠN</div>{result.warnings.map(w=><p key={w}><ShieldAlert size={15}/>{w}</p>)}</section>
        </>}
      </section>
    </div>
  </div>;
}
