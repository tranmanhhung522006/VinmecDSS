import {BrainCircuit,CheckCircle2,ShieldCheck,Sparkles,ArrowRight,AlertTriangle,UserRound,Lightbulb,FileSearch} from 'lucide-react';

type Candidate={id:string;title:string;targetDay:string;demand:number;recommendation:{recommended:{doctors:number;capacity:number;gap:number;addedCostVnd:number}|null}};
type Insight={text:string;source:string;reason?:string;evidence?:{demand:number;recommended?:{doctors:number}|null;warnings:string[]}};
type AiStatus={configured:boolean;remaining:number;dailyLimit:number};
type Props={
  scenarios:Candidate[];selected:Candidate|null;insight:Insight|null;status:AiStatus|null;
  visitor:boolean;busy:boolean;question:string;
  onQuestion:(value:string)=>void;onChoose:(id:string)=>void;onAnalyze:()=>void;
  onScenario:()=>void;onLogin:()=>void;
};
const presetQuestions=[
  'Điều gì có thể khiến phương án này thiếu công suất?',
  'Đánh đổi giữa số bác sĩ và chi phí nhân sự là gì?',
  'Manager cần kiểm tra gì trước khi phê duyệt?'
];
const reasonText:Record<string,string>={
  NOT_CONFIGURED:'Chưa cấu hình OPENAI_API_KEY trên backend.',
  DISABLED:'AI đang bị tắt bởi hạn mức hệ thống.',
  LIMIT_REACHED:'Đã đạt giới hạn lượt sử dụng AI.',
  MODEL_UNAVAILABLE:'API hoặc mô hình AI hiện không phản hồi.',
  UNVERIFIED_RESPONSE:'Phản hồi AI chưa đạt điều kiện kiểm chứng; dùng bản dự phòng.',
  RULE_BASED:'Bản giải thích theo quy tắc có thể kiểm chứng.',
  MODEL_RESPONSE:'Đã nhận phản hồi hợp lệ từ OpenAI.',
  PUBLIC_PREVIEW:'Chế độ khách chỉ dùng giải thích theo quy tắc.'
};

export default function AiWorkspace({scenarios,selected,insight,status,visitor,busy,question,onQuestion,onChoose,onAnalyze,onScenario,onLogin}:Props){
  const authentic=insight?.source==='OPENAI';
  const chosen=selected?.recommendation.recommended;
  return <div className="ai-workspace">
    <section className="ai-hero card">
      <div className="ai-hero-icon"><BrainCircuit size={28}/></div>
      <div className="ai-hero-content"><div className="micro">AI-ASSISTED DECISION SUPPORT</div><h2>AI Operations Advisor</h2>
        <p>AI hỗ trợ <strong>giải thích rủi ro, đánh đổi và các bước kiểm tra</strong> trước khi quản lý ra quyết định điều phối. Dữ liệu và số lượng bác sĩ đề xuất vẫn do DSS tính, không phải AI tự tạo.</p>
        <div className="ai-hero-status">
          <span className={'dss-tag '+(visitor?'neutral':status?.configured?'good':'warn')}>
            {visitor?'Chế độ khách: chưa gọi OpenAI':status?.configured?'Đã đặt API key (chưa kiểm tra kết nối)':'OpenAI chưa được xác nhận cấu hình'}
          </span>
          {status?.configured&&<small>Hạn mức còn lại: {status.remaining}/{status.dailyLimit} lượt trong ngày</small>}
        </div>
      </div>
    </section>
    <div className="ai-feature-grid">
      <article className="card ai-feature"><AlertTriangle size={19}/><strong>Nhận diện rủi ro</strong><p>Thiếu công suất, giới hạn phòng khám, sự không chắc chắn của dữ liệu giả lập.</p></article>
      <article className="card ai-feature"><FileSearch size={19}/><strong>Phân tích đánh đổi</strong><p>Giải thích tác động của tăng nhân sự tới mức đáp ứng và chi phí bổ sung.</p></article>
      <article className="card ai-feature"><Lightbulb size={19}/><strong>Đề xuất bước tiếp theo</strong><p>Gợi ý nội dung cần đối chiếu trước khi Manager chốt phương án.</p></article>
    </div>
    <section className="card panel ai-workstation-panel">
      <div className="panel-head"><div><div className="micro">THỰC HIỆN PHÂN TÍCH</div><h2>Chọn kịch bản và yêu cầu AI</h2><p className="muted">Các bước được minh bạch: chọn hồ sơ → xem dữ liệu DSS → hỏi AI → kiểm tra bằng chứng.</p></div><Sparkles size={19}/></div>
      {scenarios.length>0&&!visitor&&<label className="field">Kịch bản đã lưu
        <select value={selected&&scenarios.some(s=>s.id===selected.id)?selected.id:''} onChange={e=>onChoose(e.target.value)}>
          <option value="" disabled>— Chọn kịch bản —</option>
          {scenarios.map(s=><option key={s.id} value={s.id}>{s.title} · {s.targetDay.slice(0,10)} · {s.demand} lượt</option>)}
        </select>
      </label>}
      {selected?<div className="ai-current-case">
        <div><small>KỊCH BẢN ĐANG PHÂN TÍCH</small><strong>{selected.title}</strong><span>{selected.targetDay.slice(0,10)}</span></div>
        <div><small>NHU CẦU GIẢ LẬP</small><strong>{selected.demand} lượt</strong><span>Do DSS tính toán</span></div>
        <div><small>PHƯƠNG ÁN ĐỀ XUẤT</small><strong>{chosen?chosen.doctors+' bác sĩ':'Không có phương án hợp lệ'}</strong><span>{chosen?'Công suất '+chosen.capacity+' lượt':'Xem lại giới hạn nguồn lực'}</span></div>
      </div>:<div className="ai-empty-case">
        <BrainCircuit size={31}/><div><strong>Chưa có kịch bản để AI phân tích.</strong><p>Hãy tạo một mô phỏng về ngày dự kiến, lượt khám và nhân sự. Sau đó quay lại đây để nhận phân tích dựa trên dữ liệu cụ thể.</p></div>
        <button type="button" className="primary" onClick={onScenario}>Tạo kịch bản <ArrowRight size={15}/></button>
      </div>}
      {visitor&&<div className="ai-guest-note"><UserRound size={17}/><span>AI OpenAI chỉ dành cho nhân sự đã xác thực để kiểm soát chi phí. Người xem thử vẫn có thể chạy kịch bản và nhận giải thích quy tắc.</span><button type="button" className="secondary" onClick={onLogin}>Đăng nhập nhân sự</button></div>}
      {selected&&<>
        <label className="field">Câu hỏi dành cho AI<textarea rows={3} maxLength={400} value={question} onChange={e=>onQuestion(e.target.value)} placeholder="Ví dụ: Cần kiểm tra những gì trước khi phê duyệt?"/></label>
        <div className="ai-question-row">{presetQuestions.map(value=><button type="button" key={value} className="ai-prompt" onClick={()=>onQuestion(value)}>{value}</button>)}</div>
        <button className="primary" type="button" disabled={busy} onClick={onAnalyze}><Sparkles size={16}/>{busy?'Đang phân tích…':visitor?'Xem giải thích mô phỏng':'Phân tích kịch bản bằng AI'}</button>
      </>}
      {insight&&selected&&<div className="ai-result">
        <div className="ai-result-label"><span className={'dss-tag '+(authentic?'good':'neutral')}>{authentic?<><CheckCircle2 size={14}/> OpenAI đã phản hồi</>:'Giải thích dự phòng – không phải AI'}</span>
        {insight.reason&&<small>{reasonText[insight.reason]??insight.reason}</small>}</div>
        <div className="ai-output">{insight.text.split('\n').filter(Boolean).map((line,index)=><p key={index}>{line}</p>)}</div>
        {insight.evidence&&<div className="ai-evidence"><strong>Đối chiếu dữ liệu đã xác thực bởi DSS</strong>
          <span>Nhu cầu: {insight.evidence.demand} lượt · Nhân sự đề xuất: {insight.evidence.recommended?.doctors??'—'} bác sĩ</span>
          {insight.evidence.warnings.map((warning,i)=><small key={i}>{warning}</small>)}
        </div>}
        <p className="tiny muted"><ShieldCheck size={14}/> AI chỉ tham vấn. Manager chịu trách nhiệm quyết định; không sử dụng cho chẩn đoán hoặc điều trị.</p>
      </div>}
    </section>
  </div>;
}
