import {useEffect,useState} from 'react';
import {CheckCircle2,ClipboardCheck,RefreshCw,ShieldAlert,XCircle} from 'lucide-react';
import {request} from '../lib/api';

type Recommendation={doctors?:number;totalDoctorSlots?:number;planningShortfall?:number;plannedShortfall?:number;addedCostVnd?:number};
type Study={
  id:string;kind:'CAPACITY'|'SHIFT';name:string;modelId:string;modelVersion:string;
  createdAt:string;author:{name:string;role:string};
  outputSnapshot:{recommended?:Recommendation};
  review:{action:'APPROVED'|'REJECTED';rationale:string;createdAt:string;actor:{name:string}}|null;
};
const fmt=(n:number)=>new Intl.NumberFormat('vi-VN').format(n);
export default function StudiesInbox({token,role}:{token:string;role:string}){
  const [records,setRecords]=useState<Study[]>([]);
  const [active,setActive]=useState<string|null>(null);
  const [rationale,setRationale]=useState('Đã xem xét giả định mô hình, rủi ro thiếu công suất và chi phí bổ sung.');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  async function refresh(){
    setLoading(true);setError('');
    try{setRecords(await request<Study[]>('/studies','GET',undefined,token));}
    catch(e){setError(e instanceof Error?e.message:'Không tải được hồ sơ phân tích');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void refresh();},[token]);
  async function review(study:Study,action:'APPROVED'|'REJECTED'){
    if(role!=='MANAGER'||busy||study.review)return;
    if(rationale.trim().length<10){setError('Cần ghi lý do tối thiểu 10 ký tự.');return;}
    setBusy(true);setError('');setNotice('');
    try{
      await request('/studies/'+encodeURIComponent(study.id)+'/review','POST',{action,rationale},token);
      setNotice('Quyết định đã được lưu và khóa.');setActive(null);await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Không thể lưu quyết định');}
    finally{setBusy(false);}
  }
  return <div className="study-workspace">
    <section className="card panel">
      <div className="panel-head"><div><div className="micro">GOVERNED DSS WORKFLOW</div><h2>Hồ sơ phân tích & phê duyệt</h2><p className="muted">Các mô hình lưu đầu vào và kết quả được tính tại backend. Chỉ Manager phê duyệt hoặc từ chối; mỗi hồ sơ được quyết định một lần.</p></div>
        <button type="button" className="secondary" onClick={()=>void refresh()} disabled={loading}><RefreshCw size={15}/> Làm mới</button></div>
      {error&&<p role="alert" className="lab-error">{error}</p>}
      {notice&&<p className="study-notice" role="status">{notice}</p>}
      {loading?<p className="muted">Đang tải hồ sơ đã lưu…</p>:records.length===0?<div className="empty"><ClipboardCheck size={28}/><p>Chưa có hồ sơ. Chạy Capacity Planning hoặc Phân bổ bác sĩ-ca và chọn lưu phân tích.</p></div>:
        <div className="study-list">{records.map(study=>{
          const output=study.outputSnapshot?.recommended;
          const pending=!study.review;
          return <article key={study.id} className="study-item">
            <div className="study-item-head"><div><div className="micro">{study.kind==='CAPACITY'?'CAPACITY PLANNING':'SHIFT ALLOCATION'} · v{study.modelVersion}</div><h3>{study.name}</h3>
              <p className="muted">Tạo bởi {study.author.name} · {new Date(study.createdAt).toLocaleString('vi-VN')}</p></div>
              <span className={'pill '+(pending?'neutral':study.review?.action==='APPROVED'?'good':'bad')}>{pending?'CHỜ DUYỆT':study.review?.action==='APPROVED'?'ĐÃ DUYỆT':'ĐÃ TỪ CHỐI'}</span>
            </div>
            <div className="study-summary"><span>Phân bổ đề xuất: <strong>{output?.doctors??output?.totalDoctorSlots??'—'} {study.kind==='CAPACITY'?'bác sĩ':'bác sĩ-ca'}</strong></span>
              <span>Thiếu hụt kế hoạch: <strong>{fmt(output?.planningShortfall??output?.plannedShortfall??0)} lượt</strong></span>
              <span>Chi phí tăng: <strong>{fmt(output?.addedCostVnd??0)} ₫</strong></span></div>
            {study.review?<p className="study-review-note">{study.review.action==='APPROVED'?<CheckCircle2 size={15}/>:<XCircle size={15}/>} {study.review.actor.name}: {study.review.rationale}</p>:
              role==='MANAGER'?<div className="study-review-form">
                {active===study.id?<><label className="field">Lý do quyết định<textarea rows={2} maxLength={500} minLength={10} value={rationale} onChange={e=>setRationale(e.target.value)}/></label>
                  <div className="button-row"><button type="button" className="secondary danger" disabled={busy} onClick={()=>void review(study,'REJECTED')}>Từ chối</button>
                    <button type="button" className="primary" disabled={busy} onClick={()=>void review(study,'APPROVED')}>Phê duyệt</button>
                    <button type="button" className="secondary" onClick={()=>setActive(null)}>Hủy</button></div></>:
                  <button type="button" className="secondary" onClick={()=>setActive(study.id)}>Xem xét & quyết định</button>}
              </div>:<p className="lab-caption">Hồ sơ đang chờ Manager kiểm tra và phê duyệt.</p>}
          </article>;
        })}</div>}
    </section>
    <section className="card panel lab-limitations"><div className="micro">LƯU Ý</div><p><ShieldAlert size={15}/> Phê duyệt chỉ là quyết định trong mô hình học thuật; không tự động tạo lịch trực, phân công bác sĩ hay thực thi tại bệnh viện.</p></section>
  </div>;
}
