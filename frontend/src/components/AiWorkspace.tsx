import {BrainCircuit,ShieldCheck,Sparkles,ArrowRight,AlertTriangle,UserRound,Lightbulb,Calculator,Send,Clock3} from 'lucide-react';
import type {AiMessage,AiPreview} from '../lib/ai.types';

type Candidate={id:string;title:string;targetDay:string;demand:number;recommendation:{recommended:{doctors:number;capacity:number;gap:number;addedCostVnd:number}|null}};
type AiStatus={configured:boolean;remaining:number;dailyLimit:number};
type Props={
  scenarios:Candidate[];selected:Candidate|null;messages:AiMessage[];status:AiStatus|null;
  visitor:boolean;busy:boolean;question:string;
  onQuestion:(value:string)=>void;onChoose:(id:string)=>void;onAnalyze:()=>void;
  onScenario:()=>void;onLogin:()=>void;onClear:()=>void;
};
const presetQuestions=[
  'Nếu nhu cầu tăng thêm 20% thì cần bao nhiêu bác sĩ?',
  'Phương án nào cân bằng chi phí và công suất?',
  'Nguy cơ quá tải lớn nhất trong kịch bản này?',
  'Tạo bản nhận định ngắn cho Manager trước khi duyệt.'
];
const reasonText:Record<string,string>={
  NOT_CONFIGURED:'Chưa cấu hình OPENAI_API_KEY trên backend.',
  DISABLED:'Tác vụ AI đã bị tắt theo giới hạn cấu hình.',
  LIMIT_REACHED:'Đã đạt giới hạn lượt gọi AI.',
  MODEL_UNAVAILABLE:'API hoặc mô hình AI không phản hồi.',
  UNVERIFIED_RESPONSE:'Phản hồi AI không hợp lệ; DSS đã chuyển sang giải thích có kiểm chứng.',
  RULE_BASED:'Giải thích theo thuật toán và dữ liệu DSS.',
  MODEL_RESPONSE:'OpenAI đã phản hồi trong giới hạn bằng chứng.',
  PUBLIC_PREVIEW:'Chế độ khách chỉ sử dụng thuật toán và giải thích có kiểm chứng.'
};
const vn=(n:number)=>new Intl.NumberFormat('vi-VN').format(n);
function Preview({data}:{data:AiPreview}){
  return <div className="ai-simulation" aria-label="Kết quả mô phỏng lại từ DSS">
    <div className="ai-simulation-head"><Calculator size={17}/><div><strong>Kết quả What-if do DSS tính lại</strong><small>Chỉ xem thử · chưa lưu kịch bản · không phê duyệt</small></div></div>
    <div className="ai-simulation-metrics">
      <div><span>Nhu cầu gốc</span><strong>{vn(data.originalDemand)} lượt</strong></div>
      <div><span>Nhu cầu mới</span><strong>{vn(data.projectedDemand)} lượt</strong></div>
      <div><span>Phương án DSS xếp hạng cao nhất</span><strong>{data.recommended?data.recommended.doctors+' bác sĩ':'Chưa có phương án'}</strong></div>
    </div>
    <div className="table-wrap"><table><thead><tr><th>Bác sĩ</th><th>Công suất</th><th>Thiếu</th><th>Chi phí thêm</th><th>Khả thi</th></tr></thead>
      <tbody>{data.alternatives.map(a=><tr key={a.doctors} className={a.doctors===data.recommended?.doctors?'highlight-row':''}>
        <td><strong>{a.doctors}</strong></td><td>{vn(a.capacity)}</td><td>{vn(a.gap)}</td><td>{vn(a.addedCostVnd)} ₫</td><td>{a.eligible?'Có':'Vượt giới hạn'}</td>
      </tr>)}</tbody></table></div>
    {data.requestedOption&&<p className="ai-requested">Phương án nhân sự được hỏi: <strong>{data.requestedOption.doctors} bác sĩ</strong>, công suất {vn(data.requestedOption.capacity)} lượt, {data.requestedOption.eligible?'trong giới hạn':'vượt giới hạn nhân sự hoặc phòng khám'}.</p>}
  </div>;
}
export default function AiWorkspace({scenarios,selected,messages,status,visitor,busy,question,onQuestion,onChoose,onAnalyze,onScenario,onLogin,onClear}:Props){
  const chosen=selected?.recommendation.recommended;
  return <div className="ai-workspace">
    <section className="ai-hero card"><div className="ai-hero-icon"><BrainCircuit size={28}/></div>
      <div className="ai-hero-content"><h2>Trợ lý phân tích</h2>
        <p>Trao đổi về kịch bản, thử thay đổi nhu cầu và xem giải thích. Kết quả tính toán do DSS cung cấp.</p>
        <div className="ai-hero-status"><span className={'dss-tag '+(visitor?'neutral':status?.configured?'good':'warn')}>
          {visitor?'Đang dùng bản xem thử (không gọi OpenAI)':status?.configured?'Đã cấu hình dịch vụ tư vấn':'Chưa cấu hình hoặc chưa xác nhận dịch vụ'}
        </span>{status?.configured&&<small>Hạn mức: {status.remaining}/{status.dailyLimit} lượt model đã ghi nhận trong ngày</small>}</div>
      </div>
    </section>
    
    <section className="card panel ai-workstation-panel"><div className="panel-head"><div><div className="micro">PHÂN TÍCH KỊCH BẢN</div><h2>Trao đổi cùng AI theo dữ liệu DSS</h2><p className="muted">Chọn kịch bản và đặt câu hỏi.</p></div><Sparkles size={19}/></div>
      {scenarios.length>0&&!visitor&&<label className="field">Chọn kịch bản đã lưu
        <select value={selected&&scenarios.some(s=>s.id===selected.id)?selected.id:''} onChange={e=>onChoose(e.target.value)}>
          <option value="" disabled>— Chọn kịch bản —</option>
          {scenarios.map(s=><option key={s.id} value={s.id}>{s.title} · {s.targetDay.slice(0,10)} · {s.demand} lượt</option>)}
        </select></label>}
      {selected?<div className="ai-current-case">
        <div><small>KỊCH BẢN HIỆN TẠI</small><strong>{selected.title}</strong><span>{selected.targetDay.slice(0,10)}</span></div>
        <div><small>NHU CẦU GỐC</small><strong>{vn(selected.demand)} lượt</strong><span>Do DSS tính toán</span></div>
        <div><small>PHƯƠNG ÁN HIỆN TẠI</small><strong>{chosen?chosen.doctors+' bác sĩ':'Không hợp lệ'}</strong><span>{chosen?'Công suất '+vn(chosen.capacity)+' lượt':'Xem lại nguồn lực'}</span></div>
      </div>:<div className="ai-empty-case"><BrainCircuit size={31}/><div><strong>Chưa có kịch bản để phân tích.</strong><p>Tạo và lưu kịch bản (nếu đã đăng nhập) để bắt đầu.</p></div><button type="button" className="primary" onClick={onScenario}>Tạo kịch bản <ArrowRight size={15}/></button></div>}
      {visitor&&<div className="ai-guest-note"><UserRound size={17}/><span>Khách dùng giải thích theo quy tắc. Đăng nhập để sử dụng dịch vụ AI.</span><button type="button" className="secondary" onClick={onLogin}>Đăng nhập</button></div>}
      {selected&&<>
        <div className="ai-conversation" aria-live="polite" aria-label="Hội thoại phân tích AI">
          {!messages.length&&<div className="ai-conversation-empty"><BrainCircuit size={23}/><p>Hãy đặt câu hỏi đầu tiên. Ví dụ: “Nếu lượt khám tăng thêm 20%, phương án 9 bác sĩ có còn phù hợp?”</p></div>}
          {messages.map(m=><article className={'ai-chat-bubble '+(m.role==='user'?'from-user':'from-assistant')} key={m.id}>
            <div className="ai-chat-name">{m.role==='user'?'Bạn':m.response?.source==='OPENAI'?'OpenAI Operations Advisor':'DSS Advisor · giải thích dự phòng'}</div>
            <div className="ai-chat-text">{m.text.split('\n').filter(Boolean).map((line,i)=><p key={i}>{line}</p>)}</div>
            {m.response&&<div className="ai-chat-metadata">
              <span className={'dss-tag '+(m.response.source==='OPENAI'?'good':'neutral')}>{m.response.source==='OPENAI'?'OpenAI đã phản hồi':'Không dùng OpenAI'}</span>
              {m.response.cached&&<span className="ai-cached"><Clock3 size={12}/> Từ bộ nhớ đệm</span>}
              {m.response.source!=='OPENAI'&&<small>{reasonText[m.response.reason]??m.response.reason}</small>}
            </div>}
            {m.response?.evidence.comparison&&<Preview data={m.response.evidence.comparison}/>}
            {Boolean(m.response?.warnings.length)&&<div className="ai-chat-warnings"><AlertTriangle size={14}/><span>{m.response?.warnings.join(' ')}</span></div>}
            {Boolean(m.response?.nextActions.length)&&<div className="ai-next-actions"><Lightbulb size={14}/><span>{m.response?.nextActions.join(' · ')}</span></div>}
          </article>)}
        </div>
        <label className="field">Câu hỏi tiếp theo<textarea value={question} rows={3} maxLength={600} onChange={e=>onQuestion(e.target.value)} placeholder="Hỏi về rủi ro, chi phí hoặc thử thay đổi nhu cầu..."/></label>
        <div className="ai-question-row">{presetQuestions.map(q=><button key={q} type="button" className="ai-prompt" onClick={()=>onQuestion(q)}>{q}</button>)}</div>
        <div className="ai-input-actions"><button type="button" className="primary" disabled={busy||question.trim().length<4} onClick={onAnalyze}>
          {busy?<Clock3 size={15}/>:<Send size={15}/>} {busy?'Đang phân tích…':visitor?'Xem giải thích không dùng AI':'Gửi câu hỏi đến AI'}</button>
          {messages.length>0&&<button type="button" className="secondary" disabled={busy} onClick={onClear}>Xóa hội thoại hiện tại</button>}
        </div>
        <p className="tiny muted ai-safety"><ShieldCheck size={14}/> Mô phỏng trong hội thoại không thay đổi hồ sơ đã lưu. Chỉ Manager được phê duyệt.</p>
      </>}
    </section>
  </div>;
}
