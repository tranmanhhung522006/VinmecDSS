import {useEffect,useRef,useState,type ReactNode,type FormEvent} from 'react';
import StaffLogin from './components/StaffLogin';
import CapacityPlanningLab from './components/CapacityPlanningLab';
import ForecastComparisonPanel from './components/ForecastComparisonPanel';
import HistoricalVisitsPanel from './components/HistoricalVisitsPanel';
import ShiftAllocationLab from './components/ShiftAllocationLab';
import StudiesInbox from './components/StudiesInbox';
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
type Forecast={predictedVisits:number;model:string;trainingDays:number;explanation:string;targetDay:string;sample?:{day:string;visits:number}[]};
const historyDate=(day:string)=>day.slice(0,10).split('-').reverse().join('/');
const historyWeekday=(day:string)=>new Intl.DateTimeFormat('vi-VN',{weekday:'long',timeZone:'UTC'}).format(new Date(day+'T00:00:00Z'));
function ForecastEvidence({forecast}:{forecast:Forecast}){
  const sample=forecast.sample;
  const total=sample?.reduce((sum,row)=>sum+row.visits,0)??0;
  const sameWeekday=forecast.model==='WEEKDAY_MEAN_4';
  return <details className="method" key={forecast.targetDay}>
    <summary>Xem dữ liệu lịch sử dùng để dự báo</summary>
    <p>{sameWeekday?'Lấy tối đa 4 ngày cùng thứ gần nhất, có ít nhất 2 ngày phù hợp.':'Không đủ 2 ngày cùng thứ; lấy tối đa 7 ngày có dữ liệu gần nhất.'} Chỉ sử dụng các ngày trước {historyDate(forecast.targetDay)}.</p>
    {sample&&sample.length>0?<><div className="table-wrap"><table><thead><tr><th>Ngày</th><th>Thứ</th><th>Lượt khám</th></tr></thead><tbody>{sample.map(row=><tr key={row.day}><td>{historyDate(row.day)}</td><td>{historyWeekday(row.day)}</td><td>{row.visits}</td></tr>)}</tbody></table></div>
      <p><strong>Tổng: {total} lượt / {sample.length} ngày = {(total/sample.length).toLocaleString('vi-VN',{maximumFractionDigits:2})} lượt/ngày.</strong></p>
      <p> Làm tròn đến số nguyên: <strong>{forecast.predictedVisits} lượt khám.</strong></p></>:<p>Máy chủ chưa trả về danh sách ngày được dùng. Không thể xác nhận các dòng dữ liệu của lần dự báo này.</p>}
    <p className="tiny muted">Dữ liệu tổng hợp giả lập từ PostgreSQL. Xem toàn bộ lịch sử và cập nhật (nếu có quyền) ở bảng Dữ liệu lượt khám lịch sử bên dưới.</p>
  </details>;
}
type Tab='overview'|'scenario'|'capacity'|'shifts'|'studies'|'ai'|'history'|'methodology';
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
  const [demandSource,setDemandSource]=useState<'history'|'manual'>('history');
  const [forecastLoading,setForecastLoading]=useState(false),[forecastError,setForecastError]=useState('');
  const [historyVersion,setHistoryVersion]=useState(0);
  const [resultKey,setResultKey]=useState<string|null>(null);
  const token=session.token;
  const isVisitor=session.user.role==='VIEWER';
  const isPreview=selected?.id==='public-preview';
  const forecastReady=demandSource==='manual'||(!forecastLoading&&!forecastError&&forecast?.targetDay===targetDay);
  const effectiveBaseline=demandSource==='manual'?baseline:forecast?.targetDay===targetDay?forecast.predictedVisits:0;
  const projectedDemand=Math.round(effectiveBaseline*(1+growth/100));
  const makeKey=(name:string,day:string,source:'history'|'manual',base:number,change:number)=>JSON.stringify([name.trim(),day,source,base,change,source==='history'?historyVersion:0]);
  const inputKey=makeKey(title,targetDay,demandSource,effectiveBaseline,growth);
  const resultStale=!!selected&&resultKey!==null&&(resultKey!==inputKey||!forecastReady);
  const canAnalyze=!!targetDay&&!!title.trim()&&forecastReady&&Number.isInteger(effectiveBaseline)&&effectiveBaseline>=0&&effectiveBaseline<=100000;
  const canSave=!!selected&&isPreview&&!isVisitor&&session.user.role!=='ADMIN'&&!resultStale&&canAnalyze;
  function resetPrivateState(){setScenarios([]);setSelected(null);setForecast(null);setForecastLoading(false);setForecastError('');setResultKey(null);setDemandSource('history');setInsight(null);setAiStatus(null);setAiMessages([]);setError('');setNotice('');setTab('overview');setBusy(false);setSidebarOpen(false);}
  // Direct account switch: one click always displays the login screen.
  function revokeActiveSession(){
    // Revoke on the server, but never trap the user in a broken session if offline.
    const oldToken=session.token;
    if(oldToken)void request<{revoked:boolean}>('/auth/logout','POST',{},oldToken).catch(()=>null);
  }
  function switchAccount(){revokeActiveSession();revision.current++;clearSession();setSession(visitor);resetPrivateState();setSummary(null);setShowLogin(true);}
  function publicPreview(){revokeActiveSession();revision.current++;clearSession();setSession(visitor);resetPrivateState();setSummary(null);setShowLogin(false);}
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
  function navigate(t:Tab){if((t==='history'||t==='studies')&&isVisitor)return;setTab(t);setSidebarOpen(false);}
  // Automatic forecast uses the existing read-only API, never creates ForecastRun rows.
  // Ignore late responses when the date, source, history or active session changes.
  useEffect(()=>{
    if(tab!=='scenario'||demandSource!=='history'||!targetDay){setForecastLoading(false);return;}
    let active=true;
    const expected=revision.current;
    setForecast(null);setForecastError('');setForecastLoading(true);
    const timer=window.setTimeout(()=>{
      void request<Forecast>('/public/forecast','POST',{targetDay}).then(f=>{
        if(active&&expected===revision.current)setForecast(f);
      }).catch(e=>{
        if(active&&expected===revision.current)setForecastError(e instanceof Error&&e.message==='No historical data before selected date'?'Không có dữ liệu lịch sử trước ngày này. Hãy chọn ngày khác hoặc nhập thủ công.':'Không lấy được dự báo. Hãy thử lại hoặc nhập thủ công.');
      }).finally(()=>{if(active&&expected===revision.current)setForecastLoading(false);});
    },250);
    return ()=>{active=false;window.clearTimeout(timer);};
  },[tab,demandSource,targetDay,historyVersion,token]);
  function changeDemandSource(source:'history'|'manual'){
    if(source===demandSource)return;
    if(source==='manual'&&forecast?.targetDay===targetDay)setBaseline(forecast.predictedVisits);
    if(source==='history'){setForecast(null);setForecastError('');setForecastLoading(true);}
    setDemandSource(source);
  }
  function showResult(s:Scenario,key:string){
    setSelected(s);setResultKey(key);setInsight(null);setAiMessages([]);setReportOpen(false);
    setSelectedDoctors(s.recommendation.recommended?.doctors??s.alternatives.find(a=>a.eligible)?.doctors??0);
  }
  async function runScenario(e:FormEvent){
    e.preventDefault();if(busy||!canAnalyze)return;
    const key=inputKey;
    const payload={title:title.trim(),targetDay,baselineDemand:effectiveBaseline,growthPercent:growth};
    await doAction(async expected=>{
      const s=await request<Scenario>('/public/evaluate','POST',payload);
      if(expected!==revision.current)return;
      showResult(s,key);setNotice('Đã phân tích phương án. Chưa lưu kịch bản vào cơ sở dữ liệu.');
    });
  }
  async function saveScenario(){
    if(busy||!canSave||!selected)return;
    const preview=selected,key=inputKey;
    const payload={title:preview.title,targetDay:preview.targetDay.slice(0,10),baselineDemand:preview.baselineDemand,growthPercent:preview.growthPercent};
    await doAction(async expected=>{
      const saved=await request<Scenario>('/scenarios','POST',payload,token);
      if(expected!==revision.current)return;
      showResult(saved,key);
      const changed=JSON.stringify(saved.assumptions)!==JSON.stringify(preview.assumptions)||JSON.stringify(saved.alternatives)!==JSON.stringify(preview.alternatives);
      setNotice(changed?'Đã lưu. Backend đã tính lại theo nguồn lực hiện tại; hãy kiểm tra kết quả mới trước khi duyệt.':'Đã lưu kịch bản. Có thể mở AI Advisor hoặc gửi Manager xem xét.');
      await refresh(token,expected);
    });
  }
  async function selectScenario(s:Scenario){await doAction(async expected=>{const result=await request<Scenario>('/scenarios/'+s.id,'GET',undefined,token);if(expected!==revision.current)return;setDemandSource('manual');setBaseline(result.baselineDemand);setTitle(result.title);setTargetDay(result.targetDay.slice(0,10));setGrowth(result.growthPercent);showResult(result,makeKey(result.title,result.targetDay.slice(0,10),'manual',result.baselineDemand,result.growthPercent));setTab('scenario')});}
  async function selectScenarioForAi(id:string){
    const found=scenarios.find(s=>s.id===id);
    if(!found)return;
    await doAction(async expected=>{
      const result=await request<Scenario>('/scenarios/'+encodeURIComponent(id),'GET',undefined,token);
      if(expected!==revision.current)return;
      setDemandSource('manual');setBaseline(result.baselineDemand);setTitle(result.title);setTargetDay(result.targetDay.slice(0,10));setGrowth(result.growthPercent);
      showResult(result,makeKey(result.title,result.targetDay.slice(0,10),'manual',result.baselineDemand,result.growthPercent));
      setTab('ai');
    });
  }
  async function converseWithAi(){
    if(!selected||(!isVisitor&&isPreview)||question.trim().length<4)return;
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
    if(!selected||(!isVisitor&&isPreview)||resultStale)return;
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
  async function decide(action:'APPROVED'|'REJECTED'){if(!selected||isPreview||resultStale||session.user.role!=='MANAGER')return;if(rationale.trim().length<10){setError('Cần ghi lý do ít nhất 10 ký tự.');return;}await doAction(async expected=>{await request('/decisions','POST',{scenarioId:selected.id,action,alternativeDoctors:action==='APPROVED'?selectedDoctors:undefined,rationale},token);const result=await request<Scenario>('/scenarios/'+selected.id,'GET',undefined,token);if(expected!==revision.current)return;setSelected(result);setNotice('Decision finalized and recorded with the acting manager and timestamp.');await refresh(token,expected);});}
  function exportHistoryCsv(){
    if(isVisitor)return;
    const rows:unknown[][]=[['Scenario ID','Title','Target day','Demand','Recommended doctors','Decision','Created by','Created at']];
    filteredScenarios.forEach(s=>rows.push([s.id,s.title,s.targetDay.slice(0,10),s.demand,s.recommendation.recommended?.doctors??'',s.decision?.action||'PENDING',s.author?.name||'',s.createdAt]));
    downloadCsv('vinmec-dss-scenario-history.csv',rows);
  }
  function downloadReport(){if(!selected)return;doAction(async expected=>{const r=isPreview?selected:await request<object>('/reports/'+selected.id,'GET',undefined,token);if(expected!==revision.current)return;const blob=new Blob([JSON.stringify(r,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`dss-report-${selected.id.slice(0,8)}.json`;a.click();URL.revokeObjectURL(url);setReportOpen(true)});}
  if(showLogin)return <StaffLogin onLogin={login} onBack={publicPreview}/>;
  const nav:[Tab,string,ReactNode][]=[
    ['overview','Tổng quan điều hành',<BarChart3 size={18}/>],
    ['scenario','Dự báo & mô phỏng',<GitBranch size={18}/>],
    ['capacity','Capacity Planning Lab',<SlidersHorizontal size={18}/>],
    ['shifts','Phân bổ bác sĩ-ca',<CalendarClock size={18}/>],
    ['ai','AI hỗ trợ quyết định',<BrainCircuit size={18}/>],
    ...(!isVisitor?[
      ['studies','Hồ sơ phân tích & duyệt',<ClipboardCheck size={18}/>] as [Tab,string,ReactNode],
      ['history','Lịch sử quyết định',<ClipboardCheck size={18}/>] as [Tab,string,ReactNode]
    ]:[]),
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
        <h1>{tab==='overview'?'Điều hành khám ngoại trú':tab==='scenario'?'Dự báo & phân bổ nguồn lực':tab==='capacity'?'Capacity Planning Lab':tab==='shifts'?'Phân bổ nguồn lực theo ca':tab==='studies'?'Hồ sơ phân tích & phê duyệt':tab==='history'?'Hồ sơ quyết định':tab==='ai'?'Trung tâm AI hỗ trợ quyết định':'Phương pháp & quản trị AI'}</h1>
        <p className="muted">Dữ liệu minh họa cho nghiên cứu học thuật; không phải phần mềm chính thức của Vinmec.</p></div><Pill kind="info">{isVisitor?'XEM THỬ':session.user.role}</Pill></div>
  {error&&<div className="alert error"><AlertCircle size={17}/>{error}<button onClick={()=>setError('')} className="close-alert">×</button></div>}{notice&&<div className="alert success"><CheckCircle2 size={17}/>{notice}<button onClick={()=>setNotice('')} className="close-alert">×</button></div>}
  {(tab==='overview'||tab==='scenario')&&<WorkflowGuide role={session.user.role} current={tab} hasScenario={!!selected&&!resultStale} hasDecision={!!selected?.decision&&!resultStale} onNavigate={navigate}/>}
  {tab==='overview'&&<OperationsDashboard summary={summary} quality={forecastQuality} scenarios={scenarios} isVisitor={isVisitor}
    onScenario={()=>navigate('scenario')} onHistory={()=>navigate('history')}
    onRefresh={()=>void doAction(async expected=>{await refresh(token,expected);if(expected===revision.current)setNotice('Đã cập nhật dữ liệu từ backend.');})}
    onSelect={item=>{const full=scenarios.find(s=>s.id===item.id);if(full)void selectScenario(full)}}/>}
  {tab==='capacity'&&<CapacityPlanningLab department={summary?.department??null} token={session.user.role==='ADMIN'?'':token} onSaved={()=>navigate('studies')}/> }
  {tab==='shifts'&&<ShiftAllocationLab token={session.user.role==='ADMIN'?'':token} onSaved={()=>navigate('studies')}/>}
  {tab==='studies'&&!isVisitor&&<StudiesInbox token={token} role={session.user.role}/>}
  {tab==='ai'&&<AiWorkspace
    scenarios={scenarios} selected={!isVisitor&&isPreview?null:selected} messages={aiMessages} status={aiStatus}
    visitor={isVisitor} busy={busy} question={question} onQuestion={setQuestion}
    onChoose={id=>void selectScenarioForAi(id)}
    onAnalyze={()=>void converseWithAi()}
    onClear={()=>setAiMessages([])}
    onScenario={()=>navigate('scenario')} onLogin={switchAccount}/>}
  {tab==='scenario'&&<div className="two-col"><div className="left-stack"><form className="card panel" onSubmit={runScenario}>
    <div className="panel-head"><div><h2>Lập kế hoạch nguồn lực</h2><p className="muted">Chọn ngày, xác định nhu cầu khám, thử tình huống và so sánh phương án bác sĩ.</p></div><CalendarClock size={19} className="muted"/></div>
    <fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0}}>
      <div className="field-grid">
        <div className="fullfield micro">1 · THÔNG TIN KỊCH BẢN</div>
        <label className="field fullfield">Tên kịch bản<input value={title} maxLength={100} onChange={e=>setTitle(e.target.value)} required/></label>
        <label className="field fullfield">Ngày cần lập kế hoạch<input type="date" value={targetDay} onChange={e=>{setForecast(null);setForecastError('');setTargetDay(e.target.value)}} required/></label>
        <div className="fullfield micro">2 · XÁC ĐỊNH NHU CẦU KHÁM</div>
        <label className="field fullfield">Nguồn nhu cầu cơ sở<select value={demandSource} onChange={e=>changeDemandSource(e.target.value as 'history'|'manual')}><option value="history">Tự động dự báo từ lịch sử</option><option value="manual">Nhập nhu cầu thủ công</option></select></label>
        {demandSource==='history'?<div className="forecast-result fullfield">
          {forecastReady&&forecast?<><div role="status"><strong>Nhu cầu dự báo: {forecast.predictedVisits} lượt khám</strong><small>{forecast.model==='WEEKDAY_MEAN_4'?'Trung bình các ngày cùng thứ (Weekday Mean)':'Trung bình các ngày gần nhất (Moving Average)'} · {forecast.trainingDays} ngày dữ liệu lịch sử</small></div><ForecastEvidence forecast={forecast}/></>:forecastError?<><strong>{forecastError}</strong><button type="button" className="secondary" onClick={()=>{setForecastError('');setForecastLoading(true);setHistoryVersion(v=>v+1)}}>Thử lại dự báo</button></>:<small>{targetDay?'Đang lấy dự báo từ lịch sử…':'Chọn ngày để lấy dự báo.'}</small>}
        </div>:<label className="field fullfield">Lượt khám cơ sở<input type="number" min={0} max={100000} step={1} required value={baseline} onChange={e=>setBaseline(e.target.value===''?NaN:Number(e.target.value))}/><small className="muted">Giả định do người dùng nhập, không phải kết quả dự báo.</small></label>}
        <div className="fullfield micro">3 · ĐIỀU CHỈNH TÌNH HUỐNG</div>
        <label className="field fullfield">Giả định nhu cầu tăng / giảm <span className="range-value">{growth>0?'+':''}{growth}%</span><input type="range" min={-50} max={100} step={1} value={growth} onChange={e=>setGrowth(Number(e.target.value))}/><div className="range-hints"><span>-50%</span><span>+100%</span></div></label>
      </div>
      <div className="estimate"><span>Nhu cầu cần đáp ứng</span><strong>{forecastReady&&Number.isFinite(projectedDemand)?projectedDemand+' lượt':'—'}</strong></div>
      {forecastReady&&Number.isFinite(projectedDemand)&&<p className="tiny muted">{effectiveBaseline} lượt cơ sở {growth>=0?'+':'−'} {Math.abs(projectedDemand-effectiveBaseline)} lượt điều chỉnh.</p>}
      <button type="submit" className="primary" disabled={busy||!canAnalyze}>{busy?<Loader2 size={16} className="spin"/>:null} Phân tích phương án <ArrowRight size={16}/></button>
      <p className="tiny muted">Tính thử không lưu. Sau khi xem kết quả, chọn lưu nếu muốn trình Manager hoặc tham khảo AI.</p>
    </fieldset>
  </form><HistoricalVisitsPanel token={token} role={session.user.role} onChanged={async()=>{const expected=revision.current;setForecast(null);setForecastError('');setHistoryVersion(v=>v+1);await refresh(token,expected);const updated=await request<ForecastQuality>('/public/forecast-quality');if(expected===revision.current)setForecastQuality(updated);}}/><article className="card panel assumptions"><h2>Nhân sự & phòng khám</h2><p className="muted">Các giới hạn này lấy từ dữ liệu backend, AI không thể thay đổi.</p><div className="definition"><span>Doctors on current roster</span><strong>{summary?.department.activeDoctors||'—'}</strong></div><div className="definition"><span>Maximum available doctors</span><strong>{summary?.department.availableDoctors||'—'}</strong></div><div className="definition"><span>Available clinic rooms</span><strong>{summary?.department.rooms||'—'}</strong></div><div className="definition"><span>Visits per doctor per day</span><strong>{summary?.department.visitsPerDoctor||'—'}</strong></div><div className="definition"><span>Cost per extra doctor</span><strong>{summary?money(summary.department.extraDoctorCost):'—'}</strong></div></article></div>
  <div className="right-stack">{selected?<><article className="card panel analysis"><div className="panel-head"><div><div className="micro">KẾT QUẢ PHÂN TÍCH & ĐỀ XUẤT</div><h2>{selected.title}</h2><p className="muted">Nhu cầu {selected.demand} lượt · {selected.targetDay.slice(0,10)}</p></div><Pill kind={selected.decision?.action==='APPROVED'?'good':selected.decision?.action==='REJECTED'?'bad':'neutral'}>{resultStale?'CẦN TÍNH LẠI':isPreview?'CHƯA LƯU':selected.decision?.action==='APPROVED'?'ĐÃ DUYỆT':selected.decision?.action==='REJECTED'?'ĐÃ TỪ CHỐI':'CHỜ PHÊ DUYỆT'}</Pill></div>
  {resultStale&&<p className="alert error" role="status">Thông số đã thay đổi. Kết quả bên dưới thuộc lần phân tích trước; hãy bấm Phân tích phương án để cập nhật.</p>}
  <div className="recommendation"><ShieldCheck size={19}/><div><strong>{selected.recommendation.recommended?selected.recommendation.recommended.doctors===selected.assumptions.currentDoctors?'Giữ nguyên '+selected.assumptions.currentDoctors+' bác sĩ':'Đề xuất '+selected.recommendation.recommended.doctors+' bác sĩ':'Chưa có phương án hợp lệ'}</strong><p>{selected.recommendation.recommended?selected.recommendation.recommended.gap?'Vẫn thiếu '+selected.recommendation.recommended.gap+' lượt theo giả định.':'Đủ công suất theo giả định; dư '+selected.recommendation.recommended.surplus+' lượt, chi phí bổ sung '+money(selected.recommendation.recommended.addedCostVnd)+'.':'Kiểm tra lại giới hạn nhân sự và phòng khám.'}</p></div></div>
  <div className="table-wrap"><table><thead><tr><th>Bác sĩ</th><th>Công suất</th><th>Thiếu</th><th>Chi phí thêm</th><th>Trạng thái</th></tr></thead><tbody>{selected.alternatives.map(a=><tr key={a.doctors} className={a.doctors===selected.recommendation.recommended?.doctors?'highlight-row':''}><td><strong>{a.doctors}</strong>{a.doctors===selected.recommendation.recommended?.doctors&&<span className="subcell">Đề xuất</span>}</td><td>{a.capacity}</td><td className={a.gap?'red':'green'}>{a.gap}</td><td>{money(a.addedCostVnd)}</td><td><Pill kind={!a.eligible?'bad':a.servesDemand?'good':'neutral'}>{!a.eligible?'Vượt giới hạn':a.servesDemand?'Đủ công suất':'Thiếu công suất'}</Pill></td></tr>)}</tbody></table></div><ScenarioCapacityChart alternatives={selected.alternatives} demand={selected.demand} recommendedDoctors={selected.recommendation.recommended?.doctors??null}/><details className="method"><summary>Cách tính phương án đề xuất</summary><p>{selected.recommendation.criteria}</p></details><div className="button-row">{isPreview&&!isVisitor&&session.user.role!=='ADMIN'&&<button className="primary" type="button" disabled={busy||!canSave} onClick={()=>void saveScenario()}><ClipboardCheck size={15}/> Lưu kịch bản phân tích</button>}<button className="secondary" type="button" disabled={busy||resultStale} onClick={downloadReport}><FileText size={15}/> Xuất JSON</button></div>
  {isPreview&&<p className="tiny muted">{isVisitor?'Bản xem thử công khai không lưu. Đăng nhập nhân sự để lưu.':session.user.role==='ADMIN'?'Admin chỉ được tính thử, không được lưu hoặc duyệt.':'Lưu kịch bản để sử dụng AI Advisor hoặc trình Manager phê duyệt. Backend sẽ tính lại khi lưu.'}</p>}
  {reportOpen&&<small className="muted">{isPreview?'Đã xuất kết quả tính thử, chưa lưu.':'Đã xuất báo cáo từ kịch bản đã lưu.'}</small>}</article>
  {!resultStale&&(!isPreview||isVisitor)&&<article className="card panel ai-advisor">
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
  </article>}
  {!isPreview&&!resultStale&&<article className="card panel"><h2>Quyết định của quản lý</h2>{selected.decision?<div className="decision-record"><Pill kind={selected.decision.action==='APPROVED'?'good':'bad'}>{selected.decision.action}</Pill><p>{selected.decision.rationale}</p><small>Recorded by {selected.decision.actor?.name||'Manager'} · {new Date(selected.decision.createdAt).toLocaleString()}</small></div>:<><p className="muted">{isVisitor?'Bạn đang xem thử. Đăng nhập Manager để lưu và phê duyệt.':'Chỉ tài khoản Manager có thể phê duyệt hoặc từ chối. Quyết định lưu một lần, không thể ghi đè.'}</p><label className="field">Phương án cần phê duyệt<select value={selectedDoctors} onChange={e=>setSelectedDoctors(Number(e.target.value))}>{selected.alternatives.filter(a=>a.eligible).map(a=><option key={a.doctors} value={a.doctors}>{a.doctors} doctors · {a.capacity} visits</option>)}</select></label><label className="field">Lý do ra quyết định<textarea value={rationale} maxLength={500} minLength={10} rows={3} onChange={e=>setRationale(e.target.value)}/></label><div className="button-row"><button className="secondary danger" type="button" onClick={()=>decide('REJECTED')} disabled={busy||session.user.role!=='MANAGER'}>Từ chối</button><button className="primary" onClick={()=>decide('APPROVED')} disabled={busy||session.user.role!=='MANAGER'||!selected.alternatives.some(a=>a.eligible)}>Phê duyệt phương án</button></div></>}</article>}</>:<article className="card panel empty-state"><Activity size={40}/><h2>Chưa có kết quả phân tích</h2><p>Chọn ngày, xác định nhu cầu và bấm Phân tích phương án. Results are calculated in the backend and saved to PostgreSQL.</p></article>}</div></div>}
  {tab==='history'&&<div className="card panel"><div className="panel-head history-heading"><div><h2>Saved scenario registry</h2><p className="muted">Search, filter and export stored planning decisions. Select a row for detailed review.</p></div><button className="secondary" type="button" onClick={exportHistoryCsv} disabled={!filteredScenarios.length}><Download size={15}/> Export CSV</button></div>
  <div className="history-toolbar"><label className="history-search"><Search size={16}/><input aria-label="Search scenarios" value={historySearch} onChange={e=>setHistorySearch(e.target.value)} placeholder="Search scenario, date or creator…" /></label><label className="history-filter"><Filter size={16}/><select aria-label="Filter decision status" value={historyStatus} onChange={e=>setHistoryStatus(e.target.value)}><option value="ALL">All decisions</option><option value="PENDING">Pending</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label><span className="history-count">{filteredScenarios.length} / {scenarios.length} scenarios</span></div>
  {filteredScenarios.length?<div className="table-wrap"><table><thead><tr><th>Scenario</th><th>Target day</th><th>Demand</th><th>Created by</th><th>Decision</th></tr></thead><tbody>{filteredScenarios.map(s=><tr className="click-row" onClick={()=>selectScenario(s)} key={s.id}><td><strong>{s.title}</strong><span className="subcell">{s.id.slice(0,8)}</span></td><td>{s.targetDay.slice(0,10)}</td><td>{s.demand}</td><td>{s.author?.name||'—'}</td><td><Pill kind={s.decision?.action==='APPROVED'?'good':s.decision?.action==='REJECTED'?'bad':'neutral'}>{s.decision?.action||'PENDING'}</Pill></td></tr>)}</tbody></table></div>:<div className="empty">{scenarios.length?'No scenarios match the current filters.':'No saved scenarios found.'}</div>}</div>}
  {tab==='methodology'&&<><ForecastQualityCard quality={forecastQuality}/><ForecastComparisonPanel/><ModelCatalog/><div className="methods-grid"><article className="card panel"><h2>01. Scope</h2><p>This prototype addresses outpatient demand and staffing capacity only. It does not replace HIS or EMR, prescribe treatment, or connect to any Vinmec infrastructure.</p><h2>02. Forecasting baseline</h2><p>Demand forecast uses the mean of the previous four matching weekdays; if insufficient observations exist, it uses the most recent seven recorded days. Historical data are synthetic and seeded reproducibly.</p><h2>03. What-if analysis</h2><p>Demand = rounded baseline × (1 + growth rate). Capacity = doctors × assumed daily visits per doctor. Gap = max(0, demand − capacity). Eligibility requires available doctors and room capacity.</p><h2>04. Ranking</h2><p>Eligible alternatives covering demand outrank alternatives with capacity shortages. Within each group, score penalizes shortfall, extra staff and unused capacity. The score is illustrative, not a validated hospital optimization model.</p></article><article className="card panel"><h2>Data governance and limitations</h2><div className="policy"><ShieldCheck size={19}/><div><strong>Synthetic records only</strong><p>No patient identifier, real schedule or clinical record is stored.</p></div></div><div className="policy"><ShieldCheck size={19}/><div><strong>Human-in-the-loop</strong><p>Only the Manager can approve or reject an alternative. Admin cannot approve decisions.</p></div></div><div className="policy"><ShieldCheck size={19}/><div><strong>AI is advisory</strong><p>OpenAI receives aggregated scenario facts, not individual medical records. Its responses do not replace numerical calculations.</p></div></div><div className="policy"><ShieldCheck size={19}/><div><strong>Academic context</strong><p>Architecture, assumptions, costs and outcomes are hypothetical. This is not an official product or an actual Vinmec pilot.</p></div></div></article></div></>}
  </main><footer>INS3070 · Decision Support Systems · Academic demonstration using synthetic data</footer></div></div>
}