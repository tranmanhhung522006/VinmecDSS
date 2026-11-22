import {useEffect,useRef,useState,type ReactNode,type FormEvent} from 'react';
import StaffLogin from './components/StaffLogin';
import CapacityPlanningLab from './components/CapacityPlanningLab';
import ModelCatalog from './components/ModelCatalog';
import WorkflowGuide from './components/WorkflowGuide';
import OperationsDashboard from './components/OperationsDashboard';
import AiWorkspace from './components/AiWorkspace';
import type {AiMessage,AiAnswer} from './lib/ai.types';
import {ApiError,request,loadSession,saveSession,clearSession,type StaffUser} from './lib/api';
import {Activity,BarChart3,ClipboardCheck,FileText,GitBranch,LogOut,ShieldCheck,Sparkles,ArrowRight,Loader2,CheckCircle2,AlertCircle,CalendarClock,Search,Download,Filter,Stethoscope,UserRound,ChevronRight,BrainCircuit,SlidersHorizontal} from 'lucide-react';
import {ForecastQualityCard,ScenarioCapacityChart,type ForecastQuality} from './components/OperationsAnalytics';
import {downloadCsv} from './utils/csv';

type Role='MANAGER'|'COORDINATOR'|'ANALYST'|'ADMIN'|'VIEWER';
type User={name:string;email:string;role:Role};
type Alt={doctors:number;capacity:number;gap:number;surplus:number;utilizationPercent:number;addedCostVnd:number;eligible:boolean;servesDemand:boolean;score:number;reason:string};
type Scenario={id:string;title:string;targetDay:string;baselineDemand:number;growthPercent:number;demand:number;assumptions:{currentDoctors:number;availableDoctors:number;rooms:number;visitsPerDoctor:number;extraDoctorCost:number};alternatives:Alt[];recommendation:{recommended:Alt|null;criteria:string};decision?:{action:'APPROVED'|'REJECTED';alternativeDoctors:number|null;rationale:string;actor?:{name:string};createdAt:string}|null;createdAt:string;author?:{name:string};insights?:{text:string;source:string}[]};
type Summary={department:{name:string;activeDoctors:number;availableDoctors:number;rooms:number;visitsPerDoctor:number;extraDoctorCost:number};latestRecordedVisits:number;capacity:number;utilizationPercent:number;daily:{day:string;visits:number}[];disclaimer:string};
type Forecast={predictedVisits:number;model:string;trainingDays:number;explanation:string;targetDay:string};
type Tab='overview'|'scenario'|'capacity'|'ai'|'history'|'methodology';
const money=(n:number)=>new Intl.NumberFormat('en-US').format(n)+' ₫';
function Pill({children,kind='neutral'}:{children:ReactNode,kind?:'neutral'|'good'|'bad'|'info'}){return <span className={'pill '+kind}>{children}</span>}
export default function App(){
  const visitor={token:'',user:{name:'Public Visitor',email:'',role:'VIEWER' as Role}};
  const [session,setSession]=useState<{token:string;user:User}>(()=>loadSession()||visitor);
  const [showLogin,setShowLogin]=useState(false);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const revision=useRef(0);
  const [tab,setTab]=useState<Tab>('overview'),[summary,setSummary]=useState<Summary|null>(null),[scenarios,setScenarios]=useState<Scenario[]>([]),[selected,setSelected]=useState<Scenario|null>(null),[forecast,setForecast]=useState<Forecast|null>(null),[insight,setInsight]=useState<{text:string;source:string;reason?:string;evidence?:{demand:number;recommended:{doctors:number}|null;warnings:string[]}}|null>(null);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[reportOpen,setReportOpen]=useState(false);
  const [forecastQuality,setForecastQuality]=useState<ForecastQuality|null>(null);
  const [aiStatus,setAiStatus]=useState<{configured:boolean;remaining:number;dailyLimit:number}|null>(null);
  const [aiMessages,setAiMessages]=useState<AiMessage[]>([]);
  const [historySearch,setHistorySearch]=useState(''),[historyStatus,setHistoryStatus]=useState('ALL');
  const filteredScenarios=scenarios.filter(s=>(historyStatus==='ALL'||(s.decision?.action||'PENDING')===historyStatus)
    && (s.title+' '+s.targetDay+' '+(s.author?.name||'')).toLocaleLowerCase().includes(historySearch.trim().toLocaleLowerCase()));
  const [title,setTitle]=useState('Mô phỏng nhu cầu khám tăng'),[targetDay,setTargetDay]=useState(()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)}),[baseline,setBaseline]=useState(200),[growth,setGrowth]=useState(30),[rationale,setRationale]=useState('Reviewed the capacity constraints and incremental staffing cost.'),[selectedDoctors,setSelectedDoctors]=useState<number>(9),[question,setQuestion]=useState('Phương án này có những rủi ro, đánh đổi và bước kiểm tra nào trước khi phê duyệt?');
  const token=session.token;
  const isVisitor=session.user.role==='VIEWER';
  function resetPrivateState(){setScenarios([]);setSelected(null);setForecast(null);setInsight(null);setAiStatus(null);setAiMessages([]);setError('');setNotice('');setTab('overview');setBusy(false);setSidebarOpen(false);}
  // Direct account switch: one click always displays the login screen.
  function switchAccount(){revision.current++;clearSession();setSession(visitor);resetPrivateState();setSummary(null);setShowLogin(true);}
  function publicPreview(){revision.current++;clearSession();setSession(visitor);resetPrivateState();setSummary(null);setShowLogin(false);}
  function login(tok:string,user:StaffUser){revision.current++;resetPrivateState();const data={token:tok,user};saveSession(data);setSession(data);setShowLogin(false);setNotice('Đăng nhập thành công: '+user.name+'.');}
  async function refresh(t=token,expected=revision.current){
    const [sum,rows]=t?await Promise.all([
      request<Summary>('/dashboard/summary','GET',undefined,t),
      request<Scenario[]>('/scenarios','GET',undefined,t)
    ]):[await request<Summary>('/public/summary'),[] as Scenario[]];
    if(expected!==revision.current)return;
    setSummary(sum);setScenarios(rows);
  }
  useEffect(()=>{
    let alive=true;const expected=revision.current;
    async function initialize(){
      try{
        if(token){
          const account=await request<StaffUser>('/me','GET',undefined,token);
          if(!alive||expected!==revision.current)return;
          setSession(current=>({...current,user:account}));
        }
        await refresh(token,expected);
      }catch(e){
        if(!alive||expected!==revision.current)return;
        if(e instanceof ApiError&&e.status===401){publicPreview();setNotice('Phiên làm việc đã hết hạn. Hãy đăng nhập lại nếu muốn lưu dữ liệu.');}
        else setError(e instanceof Error?e.message:'Không tải được dữ liệu.');
      }
    }
    void initialize();return ()=>{alive=false};
  },[token]);
  useEffect(()=>{request<ForecastQuality>('/public/forecast-quality').then(setForecastQuality).catch(()=>setForecastQuality({sampleCount:0,mae:null,mape:null,rmse:null,bias:null,model:'N/A',message:'Chưa có kết quả đánh giá dự báo.'}));},[]);
  useEffect(()=>{if(!token){setAiStatus(null);return;}let alive=true;request<{configured:boolean;remaining:number;dailyLimit:number}>('/ai/status','GET',undefined,token).then(x=>{if(alive)setAiStatus(x)}).catch(()=>{});return ()=>{alive=false}},[token]);
  async function doAction(action:(expected:number)=>Promise<void>){const expected=revision.current;setError('');setNotice('');setBusy(true);try{await action(expected)}catch(e){if(expected!==revision.current)return;if(e instanceof ApiError&&e.status===401){switchAccount()}else setError(e instanceof Error?e.message:'Thao tác thất bại.')}finally{if(expected===revision.current)setBusy(false)}}
  function navigate(t:Tab){if(t==='history'&&isVisitor)return;setTab(t);setSidebarOpen(false);}
  async function runForecast(){await doAction(async expected=>{const f=await request<Forecast>(isVisitor?'/public/forecast':'/forecasts/run','POST',{targetDay},token);if(expected!==revision.current)return;setForecast(f);setBaseline(f.predictedVisits);setNotice('Forecast calculated from synthetic historical aggregates. You can edit baseline before running What-if.');});}
  async function runScenario(e:FormEvent){e.preventDefault();await doAction(async expected=>{const s=await request<Scenario>(isVisitor?'/public/evaluate':'/scenarios','POST',{title,targetDay,baselineDemand:baseline,growthPercent:growth},token);if(expected!==revision.current)return;setSelected(s);setInsight(null);setAiMessages([]);setReportOpen(false);setSelectedDoctors(s.recommendation.recommended?.doctors??s.alternatives.find(a=>a.eligible)?.doctors??0);setNotice(isVisitor?'Scenario calculated by the backend in public preview mode. No database record was created.':'Scenario calculated and saved in PostgreSQL.');if(!isVisitor)await refresh(token,expected);});}
  async function selectScenario(s:Scenario){await doAction(async expected=>{const result=await request<Scenario>('/scenarios/'+s.id,'GET',undefined,token);if(expected!==revision.current)return;setSelected(result);setSelectedDoctors(result.recommendation.recommended?.doctors??result.alternatives.find(a=>a.eligible)?.doctors??0);setInsight(null);setAiMessages([]);setTab('scenario')});}
  async function selectScenarioForAi(id:string){
    const found=scenarios.find(s=>s.id===id);
    if(!found)return;
    await doAction(async expected=>{
      const result=await request<Scenario>('/scenarios/'+encodeURIComponent(id),'GET',undefined,token);
      if(expected!==revision.current)return;
      setSelected(result);
      setSelectedDoctors(result.recommendation.recommended?.doctors??result.alternatives.find(a=>a.eligible)?.doctors??0);
      setInsight(null);setAiMessages([]);
      setTab('ai');
    });
  }
  async function converseWithAi(){
    if(!selected||question.trim().length<4)return;
    const prompt=question.trim();
    const history=aiMessages.slice(-6).map(m=>({role:m.role,text:m.text.slice(0,500)}));
    await doAction(async expected=>{
      let result:AiAnswer;
      if(isVisitor){
        const r=selected.recommendation.recommended;
        result={source:'RULE_BASED_FALLBACK',reason:'PUBLIC_PREVIEW',
          answer:r?'Theo dữ liệu giả lập, phương án '+r.doctors+' bác sĩ có công suất '+r.capacity+' lượt cho nhu cầu '+selected.demand+' lượt. Thiếu '+r.gap+' lượt và chi phí bổ sung '+money(r.addedCostVnd)+'. Đăng nhập nhân sự để hỏi OpenAI với phân tích What-if tự nhiên và hội thoại nhiều lượt.':'Hiện không có phương án đáp ứng ràng buộc. Hãy điều chỉnh nguồn lực để phân tích tiếp.',
          warnings:['Đây là diễn giải theo quy tắc, không phải OpenAI.'],nextActions:['Đăng nhập nhân sự và lưu kịch bản để sử dụng AI thực tế.'],
          intent:{kind:'explain',demandChangePercent:null,absoluteDemand:null,doctorDelta:null,roomDelta:null,topic:''},intentSource:'LOCAL',
          evidence:{currentDemand:selected.demand,originalRecommendation:selected.recommendation.recommended,currentAssumptions:selected.assumptions,comparison:null,note:'Public preview'},disclaimer:'Synthetic demo',cached:false};
      }else{
        result=await request<AiAnswer>('/ai/converse/'+encodeURIComponent(selected.id),'POST',{question:prompt,history},token);
      }
      if(expected!==revision.current)return;
      const id=Date.now()+aiMessages.length*2;
      setAiMessages(previous=>[...previous.slice(-12),
        {id,role:'user',text:prompt},
        {id:id+1,role:'assistant',text:result.answer,response:result}]);
      setQuestion('');
      if(!isVisitor){
        const status=await request<{configured:boolean;remaining:number;dailyLimit:number}>('/ai/status','GET',undefined,token).catch(()=>null);
        if(expected===revision.current&&status)setAiStatus(status);
      }
    });
  }
  async function generateInsight(){
    if(!selected)return;
    if(isVisitor){
      const r=selected.recommendation.recommended;
      setInsight({source:'RULE_BASED_FALLBACK',text:r?'NHẬN ĐỊNH: Nhu cầu mô phỏng '+selected.demand+' lượt; '+r.doctors+' bác sĩ có công suất '+r.capacity+' lượt.\n\nĐÁNH ĐỔI: Thiếu '+r.gap+' lượt, chi phí thêm '+money(r.addedCostVnd)+'.\n\nRỦI RO: Chưa có thông tin ca trực, chuyên khoa hay bệnh nhân cụ thể.\n\nBƯỚC TIẾP THEO: Đối chiếu nguồn lực thực tế trước quyết định.':'Chưa có phương án đủ điều kiện. Cần xem xét giới hạn nhân sự và phòng khám.'});
      return;
    }
    await doAction(async expected=>{
      const result=await request<{text:string;source:string;reason?:string;evidence?:{demand:number;recommended:{doctors:number}|null;warnings:string[]}}>('/scenarios/'+selected.id+'/insights','POST',{question},token);
      if(expected!==revision.current)return;
      setInsight(result);
      setNotice(result.source==='OPENAI'?'AI đã phân tích. Số liệu vẫn do hệ thống DSS quyết định.':'Đã sử dụng giải thích dự phòng khi AI không khả dụng hoặc vượt hạn mức.');
      const status=await request<{configured:boolean;remaining:number;dailyLimit:number}>('/ai/status','GET',undefined,token).catch(()=>null);
      if(expected===revision.current&&status)setAiStatus(status);
    });
  }
  async function decide(action:'APPROVED'|'REJECTED'){if(!selected)return;if(rationale.trim().length<10){setError('Cần ghi lý do ít nhất 10 ký tự.');return;}await doAction(async expected=>{await request('/decisions','POST',{scenarioId:selected.id,action,alternativeDoctors:action==='APPROVED'?selectedDoctors:undefined,rationale},token);const result=await request<Scenario>('/scenarios/'+selected.id,'GET',undefined,token);if(expected!==revision.current)return;setSelected(result);setNotice('Decision finalized and recorded with the acting manager and timestamp.');await refresh(token,expected);});}
  function exportHistoryCsv(){
    if(isVisitor)return;
    const rows:unknown[][]=[['Scenario ID','Title','Target day','Demand','Recommended doctors','Decision','Created by','Created at']];
    filteredScenarios.forEach(s=>rows.push([s.id,s.title,s.targetDay.slice(0,10),s.demand,s.recommendation.recommended?.doctors??'',s.decision?.action||'PENDING',s.author?.name||'',s.createdAt]));
    downloadCsv('vinmec-dss-scenario-history.csv',rows);
  }
  function downloadReport(){if(!selected)return;doAction(async expected=>{const r=isVisitor?selected:await request<object>('/reports/'+selected.id,'GET',undefined,token);if(expected!==revision.current)return;const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`dss-report-${selected.id.slice(0,8)}.json`;a.click();URL.revokeObjectURL(url);setReportOpen(true)});}
  if(showLogin)return <StaffLogin onLogin={login} onBack={publicPreview}/>;
  const nav:[Tab,string,ReactNode][]=[
    ['overview','Tổng quan điều hành',<BarChart3 size={18}/>],
    ['scenario','Dự báo & mô phỏng',<GitBranch size={18}/>],
    ['capacity','Capacity Planning Lab',<SlidersHorizontal size={18}/>],
    ['ai','AI hỗ trợ quyết định',<BrainCircuit size={18}/>],
    ...(!isVisitor?[['history','Lịch sử quyết định',<ClipboardCheck size={18}/>] as [Tab,string,ReactNode]]:[]),
    ['methodology','Phương pháp & quản trị AI',<FileText size={18}/>]
  ];
  return <div className="app-shell v05">
    <aside className={'sidebar '+(sidebarOpen?'sidebar-open':'')}>
      <div className="brand"><span className="brand-box"><Stethoscope size={19}/></span><span><strong>VINMEC DSS</strong><small>OPERATIONS · ACADEMIC DEMO</small></span></div>
      <div className="side-label">KHÁM NGOẠI TRÚ</div>
      <nav aria-label="Các phân hệ">{nav.map(([k,label,icon])=>
        <button key={k} className={'nav-item '+(tab===k?'active':'')} onClick={()=>navigate(k)} type="button">{icon}<span>{label}</span></button>
      )}</nav>
      <div className="side-spacer"/>
      <div className="side-dataset"><ShieldCheck size={18}/><div><strong>Dữ liệu giả lập</strong><span>Không có hồ sơ bệnh nhân hoặc dữ liệu vận hành thực tế.</span></div></div>
      <div className="side-account">
        <div className="side-account-info"><span className="avatar"><UserRound size={16}/></span><div><strong>{session.user.name}</strong><small>{isVisitor?'Chế độ xem thử':session.user.email+' · '+session.user.role}</small></div></div>
        <button type="button" className="account-action" onClick={switchAccount}><LogOut size={16}/>{isVisitor?'Đăng nhập nhân sự':'Đổi tài khoản / Đăng xuất'}<ArrowRight size={14}/></button>
        {!isVisitor&&<button type="button" className="public-action" onClick={publicPreview}>Quay lại bản demo công khai</button>}
      </div>
    </aside>
    <div className="workspace">
      <header className="topbar"><div className="breadcrumb">INS3070 <ChevronRight size={13}/> <strong>Hệ thống hỗ trợ quyết định</strong></div>
        <div className="top-actions"><span className="dss-tag blue">SYNTHETIC DATA</span><button type="button" className="top-account" onClick={switchAccount}><LogOut size={15}/>{isVisitor?'Đăng nhập':'Đổi tài khoản'}</button><button type="button" className="mobile-menu" onClick={()=>setSidebarOpen(o=>!o)} aria-label="Mở menu">☰</button></div>
      </header>
      <main className="main"><div className="page-head"><div><div className="eyebrow">HOSPITAL OPERATIONS · PROPOSED CASE STUDY</div>
        <h1>{tab==='overview'?'Điều hành khám ngoại trú':tab==='scenario'?'Dự báo & phân bổ nguồn lực':tab==='capacity'?'Capacity Planning Lab':tab==='history'?'Hồ sơ quyết định':tab==='ai'?'Trung tâm AI hỗ trợ quyết định':'Phương pháp & quản trị AI'}</h1>
        <p className="muted">Dữ liệu minh họa cho nghiên cứu học thuật; không phải phần mềm chính thức của Vinmec.</p></div><Pill kind="info">{isVisitor?'XEM THỬ':session.user.role}</Pill></div>
  {error&&<div className="alert error"><AlertCircle size={17}/>{error}<button onClick={()=>setError('')} className="close-alert">×</button></div>}{notice&&<div className="alert success"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')} className="close-alert">×</button></div>}
  {(tab==='overview'||tab==='scenario')&&<WorkflowGuide role={session.user.role} current={tab} hasScenario={!!selected} hasDecision={!!selected?.decision} onNavigate={navigate}/>}
  {tab==='overview'&&<OperationsDashboard summary={summary} quality={forecastQuality} scenarios={scenarios} isVisitor={isVisitor}
    onScenario={()=>navigate('scenario')} onHistory={()=>navigate('history')}
    onRefresh={()=>void doAction(async expected=>{await refresh(token,expected);if(expected===revision.current)setNotice('Đã cập nhật dữ liệu từ backend.');})}
    onSelect={item=>{const full=scenarios.find(s=>s.id===item.id);if(full)void selectScenario(full)}}/>}
  {tab==='capacity'&&<CapacityPlanningLab department={summary?.department??null}/>}
  {tab==='ai'&&<AiWorkspace
    scenarios={scenarios} selected={selected} messages={aiMessages} status={aiStatus}
    visitor={isVisitor} busy={busy} question={question} onQuestion={setQuestion}
    onChoose={id=>void selectScenarioForAi(id)}
    onAnalyze={()=>void converseWithAi()}
    onClear={()=>setAiMessages([])}
    onScenario={()=>navigate('scenario')} onLogin={switchAccount}/>}
  {tab==='scenario'&&<div className="two-col"><div className="left-stack"><form className="card panel" onSubmit={runScenario}><div className="panel-head"><div><h2>Thiết lập mô phỏng</h2><p className="muted">Chọn ngày, dự báo nhu cầu và so sánh bác sĩ, phòng khám, chi phí.</p></div><CalendarClock size={19} className="muted"/></div><div className="field-grid"><label className="field fullfield">Tên kịch bản<input value={title} maxLength={100} onChange={e=>setTitle(e.target.value)} required/></label><label className="field">Ngày cần dự báo<input type="date" value={targetDay} onChange={e=>setTargetDay(e.target.value)} required/></label><label className="field">Lượt khám cơ sở<input type="number" min={0} max={100000} value={baseline} onChange={e=>setBaseline(Number(e.target.value))}/></label><label className="field fullfield">Thay đổi nhu cầu <span className="range-value">{growth>0?'+':''}{growth}%</span><input type="range" min={-50} max={100} step={5} value={growth} onChange={e=>setGrowth(Number(e.target.value))}/><div className="range-hints"><span>-50%</span><span>+100%</span></div></label></div><div className="estimate"><span>Nhu cầu sau điều chỉnh</span><strong>{Math.round(baseline*(1+growth/100))} visits</strong></div><div className="button-row"><button type="button" className="secondary" disabled={busy} onClick={runForecast}>1. Dự báo từ lịch sử</button><button type="submit" className="primary" disabled={busy||session.user.role==='ADMIN'}>{busy?<Loader2 size={16} className="spin"/>:null} {isVisitor?'2. Tính thử (không lưu)':'2. Tính toán & lưu'} <ArrowRight size={16}/></button></div>{forecast&&<div className="forecast-result"><strong>Forecast: {forecast.predictedVisits} visits</strong><small>{forecast.model} · {forecast.trainingDays} historical days · {forecast.explanation}</small></div>}</form><article className="card panel assumptions"><h2>Nhân sự & phòng khám</h2><p className="muted">Các giới hạn này lấy từ dữ liệu backend, AI không thể thay đổi.</p><div className="definition"><span>Doctors on current roster</span><strong>{summary?.department.activeDoctors||'—'}</strong></div><div className="definition"><span>Maximum available doctors</span><strong>{summary?.department.availableDoctors||'—'}</strong></div><div className="definition"><span>Available clinic rooms</span><strong>{summary?.department.rooms||'—'}</strong></div><div className="definition"><span>Visits per doctor per day</span><strong>{summary?.department.visitsPerDoctor||'—'}</strong></div><div className="definition"><span>Cost per extra doctor</span><strong>{summary?money(summary.department.extraDoctorCost):'—'}</strong></div></article></div>
  <div className="right-stack">{selected?<><article className="card panel analysis"><div className="panel-head"><div><div className="micro">SCENARIO RESULT</div><h2>{selected.title}</h2><p className="muted">Demand {selected.demand} visits · {selected.targetDay.slice(0,10)}</p></div><Pill kind={selected.decision?.action==='APPROVED'?'good':selected.decision?.action==='REJECTED'?'bad':'neutral'}>{selected.decision?.action||'PENDING'}</Pill></div><div className="table-wrap"><table><thead><tr><th>Doctors</th><th>Capacity</th><th>Gap</th><th>Added cost</th><th>Status</th></tr></thead><tbody>{selected.alternatives.map(a=><tr key={a.doctors} className={a.doctors===selected.recommendation.recommended?.doctors?'highlight-row':''}><td><strong>{a.doctors}</strong>{a.doctors===selected.recommendation.recommended?.doctors&&<span className="subcell">Recommended</span>}</td><td>{a.capacity}</td><td className={a.gap?'red':'green'}>{a.gap}</td><td>{money(a.addedCostVnd)}</td><td><Pill kind={!a.eligible?'bad':a.servesDemand?'good':'neutral'}>{!a.eligible?'Ineligible':a.servesDemand?'Covers demand':'Shortfall'}</Pill></td></tr>)}</tbody></table></div><ScenarioCapacityChart alternatives={selected.alternatives} demand={selected.demand} recommendedDoctors={selected.recommendation.recommended?.doctors??null}/><div className="recommendation"><ShieldCheck size={19}/><div><strong>{selected.recommendation.recommended?`Recommend ${selected.recommendation.recommended.doctors} doctors`:'No eligible alternative'}</strong><p>{selected.recommendation.recommended?.reason||'Adjust availability and room assumptions.'}</p></div></div><details className="method"><summary>How the recommendation is calculated</summary><p>{selected.recommendation.criteria}</p></details><div className="button-row"><button className="secondary" type="button" disabled={busy} onClick={downloadReport}><FileText size={15}/> Export JSON report</button></div>{reportOpen&&<small className="muted">Report exported from server-side persisted results.</small>}</article>
  <article className="card panel ai-advisor">
    <div className="ai-inline-link"><BrainCircuit size={17}/><span>Có một phân hệ AI riêng để chọn và phân tích lại các kịch bản đã lưu.</span><button type="button" className="secondary" onClick={()=>navigate('ai')}>Mở trung tâm AI <ArrowRight size={14}/></button></div>
    <div className="panel-head"><div><div className="micro">PHÂN TÍCH GIẢI THÍCH · KHÔNG TỰ ĐƯA RA QUYẾT ĐỊNH</div><h2>AI Operations Advisor</h2><p className="muted">Dựa trên công suất, thiếu hụt, chi phí và ràng buộc đã được DSS tính trước.</p></div><Sparkles size={19} className="muted"/></div>
    <div className="ai-status"><span className={'dss-tag '+(isVisitor?'neutral':aiStatus?.configured?'good':'warn')}>{isVisitor?'Giải thích công khai':aiStatus?.configured?'AI đã được cấu hình':'Chưa xác nhận API key'}</span>{aiStatus?.configured&&<small>{aiStatus.remaining}/{aiStatus.dailyLimit} lượt giải thích AI còn lại trong ngày (toàn hệ thống)</small>}</div>
    <label className="field">Bạn muốn kiểm tra điều gì?<textarea rows={2} value={question} maxLength={400} onChange={e=>setQuestion(e.target.value)}/></label>
    <div className="ai-question-row">{['Có nguy cơ thiếu công suất không?','Đánh đổi giữa chi phí và nhân sự thế nào?','Cần xác minh gì trước khi phê duyệt?'].map(q=><button key={q} type="button" className="ai-prompt" onClick={()=>setQuestion(q)}>{q}</button>)}</div>
    <button type="button" className="primary" disabled={busy} onClick={generateInsight}><Sparkles size={15}/>{busy?'Đang phân tích…':isVisitor?'Xem giải thích miễn phí':'Phân tích bằng AI / dự phòng'}</button>
    {insight&&<div className="insight" aria-live="polite"><div className="insight-head"><Pill kind={insight.source==='OPENAI'?'info':'neutral'}>{insight.source==='OPENAI'?'OpenAI · chỉ giải thích':'Hệ thống · dự phòng có kiểm chứng'}</Pill>{insight.reason&&<small>{insight.reason}</small>}</div>
      <div className="ai-output">{insight.text.split('\n').filter(Boolean).map((line,i)=><p key={i}>{line}</p>)}</div>
      {insight.evidence&&<div className="ai-evidence"><strong>Bằng chứng số liệu (DSS tính, không phải AI)</strong><span>Nhu cầu: {insight.evidence.demand} lượt · Phương án: {insight.evidence.recommended?.doctors??'—'} bác sĩ</span>{insight.evidence.warnings.map((w,i)=><small key={i}>{w}</small>)}</div>}
      <small>Dữ liệu giả lập. Không sử dụng để đưa ra quyết định khám chữa bệnh thực tế.</small></div>}
  </article>
  <article className="card panel"><h2>Quyết định của quản lý</h2>{selected.decision?<div className="decision-record"><Pill kind={selected.decision.action==='APPROVED'?'good':'bad'}>{selected.decision.action}</Pill><p>{selected.decision.rationale}</p><small>Recorded by {selected.decision.actor?.name||'Manager'} · {new Date(selected.decision.createdAt).toLocaleString()}</small></div>:<><p className="muted">{isVisitor?'Bạn đang xem thử. Đăng nhập Manager để lưu và phê duyệt.':'Chỉ tài khoản Manager có thể phê duyệt hoặc từ chối. Quyết định lưu một lần, không thể ghi đè.'}</p><label className="field">Phương án cần phê duyệt<select value={selectedDoctors} onChange={e=>setSelectedDoctors(Number(e.target.value))}>{selected.alternatives.filter(a=>a.eligible).map(a=><option key={a.doctors} value={a.doctors}>{a.doctors} doctors · {a.capacity} visits</option>)}</select></label><label className="field">Lý do ra quyết định<textarea value={rationale} maxLength={500} minLength={10} rows={3} onChange={e=>setRationale(e.target.value)}/></label><div className="button-row"><button className="secondary danger" type="button" onClick={()=>decide('REJECTED')} disabled={busy||session.user.role!=='MANAGER'}>Từ chối</button><button className="primary" onClick={()=>decide('APPROVED')} disabled={busy||session.user.role!=='MANAGER'||!selected.alternatives.some(a=>a.eligible)}>Phê duyệt phương án</button></div></>}</article></>:<article className="card panel empty-state"><Activity size={40}/><h2>Explore decision alternatives</h2><p>Set a baseline and demand change, then run the analysis. Results are calculated in the backend and saved to PostgreSQL.</p></article>}</div></div>}
  {tab==='history'&&<div className="card panel"><div className="panel-head history-heading"><div><h2>Saved scenario registry</h2><p className="muted">Search, filter and export stored planning decisions. Select a row for detailed review.</p></div><button className="secondary" type="button" onClick={exportHistoryCsv} disabled={!filteredScenarios.length}><Download size={15}/> Export CSV</button></div>
  <div className="history-toolbar"><label className="history-search"><Search size={16}/><input aria-label="Search scenarios" value={historySearch} onChange={e=>setHistorySearch(e.target.value)} placeholder="Search scenario, date or creator…" /></label><label className="history-filter"><Filter size={16}/><select aria-label="Filter decision status" value={historyStatus} onChange={e=>setHistoryStatus(e.target.value)}><option value="ALL">All decisions</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label><span className="history-count">{filteredScenarios.length} / {scenarios.length} scenarios</span></div>
  {filteredScenarios.length?<div className="table-wrap"><table><thead><tr><th>Scenario</th><th>Target day</th><th>Demand</th><th>Created by</th><th>Decision</th></tr></thead><tbody>{filteredScenarios.map(s=><tr className="click-row" onClick={()=>selectScenario(s)} key={s.id}><td><strong>{s.title}</strong><span className="subcell">{s.id.slice(0,8)}</span></td><td>{s.targetDay.slice(0,10)}</td><td>{s.demand}</td><td>{s.author?.name||'—'}</td><td><Pill kind={s.decision?.action==='APPROVED'?'good':s.decision?.action==='REJECTED'?'bad':'neutral'}>{s.decision?.action||'PENDING'}</Pill></td></tr>)}</tbody></table></div>:<div className="empty">{scenarios.length?'No scenarios match the current filters.':'No saved scenarios found.'}</div>}</div>}
  {tab==='methodology'&&<><ForecastQualityCard quality={forecastQuality}/><ModelCatalog/><div className="methods-grid"><article className="card panel"><h2>01. Scope</h2><p>This prototype addresses outpatient demand and staffing capacity only. It does not replace HIS or EMR, prescribe treatment, or connect to any Vinmec infrastructure.</p><h2>02. Forecasting baseline</h2><p>Demand forecast uses the mean of the previous four matching weekdays; if insufficient observations exist, it uses the most recent seven recorded days. Historical data are synthetic and seeded reproducibly.</p><h2>03. What-if analysis</h2><p>Demand = rounded baseline × (1 + growth rate). Capacity = doctors × assumed daily visits per doctor. Gap = max(0, demand − capacity). Eligibility requires available doctors and room capacity.</p><h2>04. Ranking</h2><p>Eligible alternatives covering demand outrank alternatives with capacity shortages. Within each group, score penalizes shortfall, extra staff and unused capacity. The score is illustrative, not a validated hospital optimization model.</p></article><article className="card panel"><h2>Data governance and limitations</h2><div className="policy"><ShieldCheck size={19}/><div><strong>Synthetic records only</strong><p>No patient identifier, real schedule or clinical record is stored.</p></div></div><div className="policy"><ShieldCheck size={19}/><div><strong>Human-in-the-loop</strong><p>Only the Manager can approve or reject an alternative. Admin cannot approve decisions.</p></div></div><div className="policy"><ShieldCheck size={19}/><div><strong>AI is advisory</strong><p>OpenAI receives aggregated scenario facts, not individual medical records. Its responses do not replace numerical calculations.</p></div></div><div className="policy"><ShieldCheck size={19}/><div><strong>Academic context</strong><p>Architecture, assumptions, costs and outcomes are hypothetical. This is not an official product or an actual Vinmec pilot.</p></div></div></article></div></>}
  </main><footer>INS3070 · Decision Support Systems · Academic demonstration using synthetic data</footer></div></div>
}