import {ArrowRight,CheckCircle2,ClipboardCheck,LineChart,SlidersHorizontal,BookOpen} from 'lucide-react';
type Props={role:string;current:'overview'|'scenario'|'history'|'methodology';hasScenario:boolean;hasDecision:boolean;onNavigate:(tab:'overview'|'scenario'|'history'|'methodology')=>void};
const steps=[
  {id:1,label:'Xem dữ liệu',detail:'Hiểu lượt khám, công suất và xu hướng',tab:'overview' as const,icon:LineChart},
  {id:2,label:'Dự báo nhu cầu',detail:'Chọn ngày, chạy mô hình, kiểm tra đầu vào',tab:'scenario' as const,icon:BookOpen},
  {id:3,label:'So sánh phương án',detail:'Thử tăng nhu cầu, xem bác sĩ và chi phí',tab:'scenario' as const,icon:SlidersHorizontal},
  {id:4,label:'Ra quyết định',detail:'Manager duyệt; những vai trò khác chỉ theo dõi',tab:'scenario' as const,icon:ClipboardCheck}
];
export default function WorkflowGuide({role,current,hasScenario,hasDecision,onNavigate}:Props){
  return <section className="card panel guided-workflow" aria-label="Quy trình sử dụng hệ thống">
    <div className="panel-head"><div><div className="micro">BẮT ĐẦU TẠI ĐÂY</div><h2>Quy trình sử dụng trong 4 bước</h2><p className="muted">Đi từ dữ liệu lịch sử đến lựa chọn nguồn lực và quyết định quản lý.</p></div><span className="workflow-mode">{role==='VIEWER'?'Chế độ xem thử':role==='MANAGER'?'Quyền phê duyệt':'Quyền phân tích'}</span></div>
    <div className="guided-grid">{steps.map(step=>{
      const done=step.id===1||step.id===2&&hasScenario||step.id===3&&hasScenario||step.id===4&&hasDecision;
      const Icon=step.icon;
      return <button type="button" className={'guided-step '+(current===step.tab?'is-current':'')} key={step.id} onClick={()=>onNavigate(step.tab)}>
        <span className="guided-top"><span className="guided-number">{String(step.id).padStart(2,'0')}</span>{done?<CheckCircle2 size={15}/>:<Icon size={16}/>}</span>
        <strong>{step.label}</strong><small>{step.detail}</small><span className="guided-action">{step.tab===current?'Đang ở màn hình này':'Mở chức năng'} <ArrowRight size={13}/></span>
      </button>
    })}</div>
    <p className="guided-note"><strong>Điểm cần nhớ:</strong> AI chỉ giải thích số liệu; hệ thống tính toán phương án. Chỉ Manager có quyền phê duyệt. Đây là mô hình với dữ liệu tổng hợp giả lập, không đưa ra quyết định y khoa.</p>
  </section>;
}
