import {Activity, ArrowRight, BarChart3, CheckCircle2, RefreshCw, ShieldCheck, Stethoscope, TriangleAlert, Users} from 'lucide-react';
import {BarChart,Bar,CartesianGrid,ReferenceLine,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {DemandPulse,ForecastQualityCard,type ForecastQuality} from './OperationsAnalytics';

type Summary={department:{name:string;activeDoctors:number;availableDoctors:number;rooms:number;visitsPerDoctor:number;extraDoctorCost:number};latestRecordedVisits:number;capacity:number;utilizationPercent:number;daily:{day:string;visits:number}[];disclaimer:string};
type Scenario={id:string;title:string;targetDay:string;demand:number;decision?:{action:'APPROVED'|'REJECTED'}|null;recommendation:{recommended:{doctors:number}|null}};
const fmt=(n:number)=>new Intl.NumberFormat('vi-VN').format(n);
export default function OperationsDashboard({summary,quality,scenarios,isVisitor,onScenario,onHistory,onRefresh,onSelect}:{
  summary:Summary|null;quality:ForecastQuality|null;scenarios:Scenario[];isVisitor:boolean;
  onScenario:()=>void;onHistory:()=>void;onRefresh:()=>void;onSelect:(s:Scenario)=>void;
}){
  const peak=summary?.daily.reduce<{day:string;visits:number}|null>((acc,v)=>!acc||v.visits>acc.visits?v:acc,null)??null;
  const pending=scenarios.filter(s=>!s.decision).length;
  const metrics=[
    {label:'Lượt khám ghi nhận',value:summary?fmt(summary.latestRecordedVisits):'—',hint:'Ngày tổng hợp giả lập gần nhất',icon:<Activity size={18}/>},
    {label:'Công suất hiện tại',value:summary?fmt(summary.capacity):'—',hint:(summary?.department.activeDoctors??'—')+' bác sĩ × '+(summary?.department.visitsPerDoctor??'—')+' lượt',icon:<Users size={18}/>},
    {label:'Mức sử dụng',value:summary?summary.utilizationPercent+'%':'—',hint:'Tỷ lệ lượt khám / công suất',icon:<BarChart3 size={18}/>},
    {label:'Kịch bản chờ duyệt',value:isVisitor?'—':fmt(pending),hint:isVisitor?'Đăng nhập để xem lịch sử':'Chờ Manager ra quyết định',icon:<ShieldCheck size={18}/>}
  ];
  return <>
    <div className="ops-context"><div className="ops-context-icon"><Stethoscope size={22}/></div><div><strong>Điều phối công suất khám ngoại trú</strong><span>{summary?.department.name??'Đang đọc dữ liệu'} · Ngày gần nhất: {summary?.daily.at(-1)?.day??'—'}</span></div><button type="button" className="secondary" onClick={onRefresh}><RefreshCw size={15}/> Làm mới</button></div>
    <section className="stats">{metrics.map(x=><div className="ops-metric card" key={x.label}><div className="ops-metric-label"><span>{x.label}</span>{x.icon}</div><strong>{x.value}</strong><small>{x.hint}</small></div>)}</section>
    <div className="ops-layout"><section className="card panel main-chart">
      <div className="panel-head"><div><div className="micro">NHU CẦU KHÁM THEO NGÀY</div><h2>Dòng bệnh nhân giả lập & công suất</h2><p className="muted">Tổng hợp 14 ngày; đường nét đứt thể hiện công suất bác sĩ/ngày</p></div><span className="dss-tag blue">Lượt / ngày</span></div>
      <div className="chart-area">{summary?.daily.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={summary.daily} margin={{top:12,right:12,bottom:4,left:-12}}><CartesianGrid vertical={false} stroke="#e6ecef"/><XAxis dataKey="day" tickFormatter={(x:string)=>x.slice(5)} tick={{fontSize:11,fill:'#738a98'}} axisLine={false} tickLine={false}/><YAxis tick={{fontSize:11,fill:'#738a98'}} axisLine={false} tickLine={false}/><Tooltip formatter={value=>[fmt(Number(value))+' lượt','Lượt khám']}/><ReferenceLine y={summary.capacity} stroke="#bc8758" strokeDasharray="5 5"/><Bar dataKey="visits" fill="#42879c" radius={[4,4,0,0]} maxBarSize={40}/></BarChart></ResponsiveContainer>:<p className="empty">Chưa có dữ liệu; cần kiểm tra seed hoặc kết nối cơ sở dữ liệu.</p>}</div>
    </section><section className="card panel ops-priority"><div className="micro">TỔNG QUAN NGUỒN LỰC</div><h2>Nguồn lực & rủi ro</h2>
      <div className="resource-summary"><strong>{summary?fmt(summary.department.activeDoctors)+' / '+fmt(summary.department.availableDoctors):'—'}</strong><span>Bác sĩ đang bố trí / có thể huy động</span></div>
      <div className="resource-summary"><strong>{summary?.department.rooms??'—'}</strong><span>Phòng khám khả dụng</span></div>
      <div className="resource-summary"><strong>{peak?fmt(peak.visits):'—'}</strong><span>Lượt khám cao nhất gần đây · {peak?.day??'—'}</span></div>
      <div className="ops-risk"><TriangleAlert size={17}/><span>Chỉ số giả lập phục vụ lập kế hoạch; không phản ánh bệnh viện thực tế.</span></div>
      <button className="primary full" type="button" onClick={onScenario}>Bắt đầu mô phỏng <ArrowRight size={16}/></button>
    </section></div>
    <DemandPulse daily={summary?.daily??[]} capacity={summary?.capacity??0}/>
    <div className="ops-layout ops-bottom"><ForecastQualityCard quality={quality}/><section className="card panel ops-priority"><div className="micro">QUY TRÌNH QUYẾT ĐỊNH</div><h2>Dữ liệu → Dự báo → Mô phỏng → Duyệt</h2>
      {['Xem lượt khám và nguồn lực hiện tại','Chạy dự báo theo ngày mục tiêu','So sánh phương án: bác sĩ, công suất, chi phí','Manager kiểm tra và phê duyệt'].map((item,i)=><div className="ops-check" key={item}><CheckCircle2 size={16}/><span>{i+1}. {item}</span></div>)}
      <button type="button" className="secondary full" onClick={onScenario}>Đi tới mô phỏng <ArrowRight size={15}/></button>
    </section></div>
    {!isVisitor&&<section className="card panel recent"><div className="panel-head"><div><h2>Kịch bản vừa phân tích</h2><p className="muted">Lịch sử được lưu trong PostgreSQL</p></div><button className="secondary" onClick={onHistory}>Xem tất cả <ArrowRight size={15}/></button></div>
      {scenarios.length?<div className="table-wrap"><table><thead><tr><th>Kịch bản</th><th>Nhu cầu</th><th>Bác sĩ đề xuất</th><th>Trạng thái</th></tr></thead><tbody>{scenarios.slice(0,5).map(s=><tr key={s.id} className="click-row" onClick={()=>onSelect(s)}><td><strong>{s.title}</strong><small className="subcell">{s.targetDay.slice(0,10)}</small></td><td>{fmt(s.demand)} lượt</td><td>{s.recommendation.recommended?.doctors??'—'}</td><td>{s.decision?.action??'CHỜ DUYỆT'}</td></tr>)}</tbody></table></div>:<p className="empty">Chưa có kịch bản được lưu.</p>}
    </section>}
  </>;
}
