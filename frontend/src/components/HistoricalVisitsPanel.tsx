import {useEffect,useState,type FormEvent} from 'react';
import {CalendarDays,Database,History,Save,ShieldCheck} from 'lucide-react';
import {request} from '../lib/api';

type Day={day:string;morningVisits:number;afternoonVisits:number;totalVisits:number};
type Listing={department:string|null;totalDays:number;days:Day[];synthetic:true;note?:string};
type Changes={changes:{id:string;day:string;beforeMorning:number|null;beforeAfternoon:number|null;afterMorning:number;afterAfternoon:number;reason:string;createdAt:string;actor:{name:string;role:string}}[]};
type Props={token:string;role:string;onChanged:()=>Promise<void>|void};
const fmt=(n:number)=>new Intl.NumberFormat('vi-VN').format(n);
const today=()=>new Date(Date.now()+7*60*60*1000).toISOString().slice(0,10);

export default function HistoricalVisitsPanel({token,role,onChanged}:Props){
  const canEdit=role==='MANAGER'||role==='ADMIN';
  const [data,setData]=useState<Listing|null>(null);
  const [changes,setChanges]=useState<Changes['changes']>([]);
  const [day,setDay]=useState(today);
  const [morning,setMorning]=useState(0);
  const [afternoon,setAfternoon]=useState(0);
  const [reason,setReason]=useState('');
  const [search,setSearch]=useState('');
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');

  async function reload(){
    const [list,audit]=await Promise.all([
      request<Listing>('/public/visit-history'),
      canEdit?request<Changes>('/visit-history/changes','GET',undefined,token):Promise.resolve({changes:[]})
    ]);
    setData(list);setChanges(audit.changes);
  }
  useEffect(()=>{
    let alive=true;setLoading(true);setError('');
    const task=Promise.all([
      request<Listing>('/public/visit-history'),
      canEdit?request<Changes>('/visit-history/changes','GET',undefined,token):Promise.resolve({changes:[]})
    ]);
    void task.then(([list,audit])=>{if(alive){setData(list);setChanges(audit.changes)}})
      .catch(err=>{if(alive)setError(err instanceof Error?err.message:'Không thể tải dữ liệu lịch sử')})
      .finally(()=>{if(alive)setLoading(false)});
    return ()=>{alive=false};
  },[token,canEdit]);

  function pick(row:Day){
    if(!canEdit)return;
    setDay(row.day);setMorning(row.morningVisits);setAfternoon(row.afternoonVisits);
    setReason('');setError('');setNotice('Đang chỉnh sửa ngày '+row.day+'.');
  }
  async function save(e:FormEvent){
    e.preventDefault();
    if(!canEdit||saving)return;
    setSaving(true);setError('');setNotice('');
    try{
      const result=await request<{updated:boolean;totalVisits:number}>('/visit-history','POST',
        {day,morningVisits:morning,afternoonVisits:afternoon,reason},token);
      await reload();
      await onChanged();
      setNotice(result.updated?'Đã lưu '+fmt(result.totalVisits)+' lượt khám cho '+day+'. Dữ liệu này được dùng khi dự báo các ngày sau đó.':'Dữ liệu ngày này không thay đổi.');
    }catch(err){setError(err instanceof Error?err.message:'Không thể lưu dữ liệu')}
    finally{setSaving(false)}
  }
  const rows=data?.days.filter(row=>row.day.includes(search.trim())).slice(0,60)??[];
  return <section className="card panel visit-history-panel" aria-label="Dữ liệu lịch sử lượt khám">
    <div className="panel-head"><div>
      <div className="micro">HISTORICAL DATA MANAGEMENT</div>
      <h2>Dữ liệu lượt khám lịch sử</h2>
      <p className="muted">Đây là nguồn dữ liệu mà các mô hình dự báo đang đọc từ PostgreSQL. Khác với “Lượt khám cơ sở” bên trên: nhập giả định kịch bản không ghi vào lịch sử.</p>
    </div><Database size={21} className="muted"/></div>
    <div className="visit-history-meta">
      <span><CalendarDays size={15}/>{data?fmt(data.totalDays)+' ngày đã lưu':loading?'Đang tải dữ liệu…':'—'}</span>
      <span><ShieldCheck size={15}/>Dữ liệu tổng hợp giả lập, không chứa hồ sơ bệnh nhân</span>
    </div>
    {canEdit?<form onSubmit={save} className="visit-history-form">
      <div className="visit-history-form-head"><strong>Thêm / cập nhật ngày ghi nhận</strong><span>Chỉ Manager và Admin được lưu</span></div>
      <div className="visit-history-fields">
        <label className="field">Ngày ghi nhận
          <input type="date" required max={today()} value={day} onChange={e=>setDay(e.target.value)}/>
        </label>
        <label className="field">Lượt khám ca sáng (08:00–12:00)
          <input type="number" min="0" max="100000" step="1" required value={morning} onChange={e=>setMorning(Number(e.target.value))}/>
        </label>
        <label className="field">Lượt khám ca chiều (13:00–17:00)
          <input type="number" min="0" max="100000" step="1" required value={afternoon} onChange={e=>setAfternoon(Number(e.target.value))}/>
        </label>
      </div>
      <label className="field">Ghi chú thay đổi (không bắt buộc)
        <input maxLength={300} value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ví dụ: Bổ sung ngày 57 cho thử nghiệm dự báo"/>
      </label>
      <div className="visit-history-actions"><span>Tổng ngày đã nhập: <strong>{fmt(morning+afternoon)} lượt</strong></span>
        <button type="submit" className="primary" disabled={saving||!day||morning<0||afternoon<0||morning+afternoon>100000}>
          <Save size={15}/>{saving?'Đang lưu…':'Lưu vào dữ liệu lịch sử'}
        </button>
      </div>
    </form>:<p className="visit-history-readonly">Bạn có thể xem dữ liệu đầu vào dự báo. Để thêm hoặc sửa một ngày, đăng nhập Manager/Admin.</p>}
    {error&&<p className="lab-error" role="alert">{error}</p>}
    {notice&&<p className="study-notice" role="status">{notice}</p>}
    <div className="visit-history-listhead"><div><strong>Bảng lượt khám theo ngày</strong><p className="muted">Mỗi dòng là tổng hai ca; mô hình dự báo sử dụng tổng lượt khám của ngày.</p></div>
      <input type="search" aria-label="Lọc ngày lịch sử" placeholder="Tìm ngày YYYY-MM-DD" value={search} onChange={e=>setSearch(e.target.value)}/></div>
    <div className="table-wrap visit-history-scroll">
      <table><thead><tr><th>Ngày</th><th>Ca sáng</th><th>Ca chiều</th><th>Tổng lượt khám</th>{canEdit&&<th>Thao tác</th>}</tr></thead>
      <tbody>{rows.map(row=><tr key={row.day}><td>{row.day}</td><td>{fmt(row.morningVisits)}</td><td>{fmt(row.afternoonVisits)}</td>
        <td><strong>{fmt(row.totalVisits)}</strong></td>{canEdit&&<td><button className="secondary" type="button" onClick={()=>pick(row)}>Chỉnh sửa</button></td>}</tr>)}
        {!rows.length&&<tr><td colSpan={canEdit?5:4}>{loading?'Đang tải…':'Không có ngày phù hợp.'}</td></tr>}
      </tbody></table></div>
    {canEdit&&changes.length>0&&<details className="visit-history-audit"><summary><History size={15}/> Lịch sử cập nhật dữ liệu ({changes.length} thay đổi gần nhất)</summary>
      <div className="table-wrap"><table><thead><tr><th>Ngày</th><th>Trước (sáng/chiều)</th><th>Sau (sáng/chiều)</th><th>Người cập nhật</th><th>Ghi chú</th></tr></thead>
        <tbody>{changes.slice(0,25).map(change=><tr key={change.id}><td>{change.day.slice(0,10)}</td><td>{change.beforeMorning??'—'} / {change.beforeAfternoon??'—'}</td>
          <td>{change.afterMorning} / {change.afterAfternoon}</td><td>{change.actor.name}</td><td>{change.reason||'—'}</td></tr>)}</tbody></table></div>
    </details>}
    <p className="lab-caption">Thêm dữ liệu của ngày D sẽ ảnh hưởng dự báo những ngày sau D và có thể làm thay đổi kết quả so sánh 3 mô hình. Những kịch bản đã lưu trước đó không tự tính lại.</p>
  </section>;
}
