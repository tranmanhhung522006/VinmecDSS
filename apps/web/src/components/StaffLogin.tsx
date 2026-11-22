import {useEffect,useState,type FormEvent} from 'react';
import {ArrowRight,AlertCircle,CheckCircle2,Eye,EyeOff,LockKeyhole,ShieldCheck} from 'lucide-react';
import {ApiError,request,type StaffUser} from '../lib/api';

type Props={onLogin:(token:string,user:StaffUser)=>void;onBack:()=>void};
const demoAccounts=[
  {email:'manager@demo.local',label:'Hospital Manager',detail:'Phê duyệt / từ chối phương án'},
  {email:'coordinator@demo.local',label:'Operations Coordinator',detail:'Tạo và đánh giá kịch bản'},
  {email:'analyst@demo.local',label:'Data Analyst',detail:'Kiểm tra dự báo và phân tích'},
  {email:'admin@demo.local',label:'System Administrator',detail:'Quản trị tài khoản demo'}
];

export default function StaffLogin({onLogin,onBack}:Props){
  const [email,setEmail]=useState('manager@demo.local');
  const [password,setPassword]=useState('');
  const [visible,setVisible]=useState(false);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState<'loading'|'available'|'unavailable'|'unknown'>('loading');
  useEffect(()=>{
    let alive=true;
    request<{staffLoginAvailable:boolean}>('/auth/status').then(v=>{if(alive)setStatus(v.staffLoginAvailable?'available':'unavailable');})
      .catch(()=>{if(alive)setStatus('unknown')});
    return ()=>{alive=false};
  },[]);
  async function submit(e:FormEvent){
    e.preventDefault();
    if(working)return;
    setError('');
    setWorking(true);
    try{
      const result=await request<{accessToken:string;user:StaffUser}>('/auth/login','POST',{email:email.trim().toLowerCase(),password});
      if(!result.accessToken||!result.user)throw new Error('Máy chủ chưa tạo được phiên đăng nhập.');
      const account=await request<StaffUser>('/me','GET',undefined,result.accessToken);
      onLogin(result.accessToken,account);
    }catch(err){
      setError(err instanceof ApiError?err.message:err instanceof Error?err.message:'Không thể đăng nhập.');
    }finally{setWorking(false);}
  }
  return <main className="login-layout">
    <div className="login-left">
      <div className="mark">DSS<span> / </span>LAB</div>
      <div><div className="eyebrow light">ACADEMIC PROJECT · INS3070</div><h1>Quyết định điều phối dựa trên dữ liệu rõ ràng.</h1><p>Hệ thống hỗ trợ dự báo nhu cầu khám, so sánh nguồn lực và ghi nhận quyết định của quản lý.</p></div>
      <div className="tiny">Dữ liệu giả lập · Hệ thống học thuật độc lập, không phải sản phẩm chính thức của Vinmec.</div>
    </div>
    <div className="login-right">
      <form className="login-box" onSubmit={submit}>
        <div className="micro">STAFF WORKSPACE</div><h2>Đăng nhập nhân sự</h2>
        <p className="muted">Chọn tài khoản mẫu hoặc nhập email được cấp. Mật khẩu được quản trị viên cấu hình riêng trên máy chủ.</p>
        <div className={'login-status '+(status==='available'?'online':status==='unavailable'?'offline':'')}>
          {status==='available'?<CheckCircle2 size={15}/>:<ShieldCheck size={15}/>}
          {status==='available'?'Đã có tài khoản nhân sự trên hệ thống':status==='unavailable'?'Chưa khởi tạo tài khoản. Quản trị viên cần chạy seed với DEMO_PASSWORD.':status==='unknown'?'Chưa kiểm tra được trạng thái đăng nhập.':'Đang kiểm tra kết nối đăng nhập…'}
        </div>
        <label htmlFor="staff-email">Email đăng nhập
          <input id="staff-email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} placeholder="email@demo.local" required/>
        </label>
        <label htmlFor="demo-role">Chọn nhanh tài khoản mẫu
          <select id="demo-role" value={demoAccounts.some(a=>a.email===email)?email:''} onChange={e=>{setEmail(e.target.value);setError('');}}>
            <option value="" disabled>— Email khác / nhập thủ công —</option>
            {demoAccounts.map(account=><option key={account.email} value={account.email}>{account.label}</option>)}
          </select>
          <small className="login-hint">Chọn vai trò chỉ điền email, không tự cấp quyền hoặc tạo mật khẩu.</small>
        </label>
        <label htmlFor="staff-password">Mật khẩu
          <span className="password-field"><input id="staff-password" type={visible?'text':'password'} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} minLength={1} required placeholder="Nhập mật khẩu đã được cấp"/><button type="button" onClick={()=>setVisible(x=>!x)} aria-label={visible?'Ẩn mật khẩu':'Hiện mật khẩu'}>{visible?<EyeOff size={17}/>:<Eye size={17}/>}</button></span>
        </label>
        {error&&<div className="alert error" role="alert"><AlertCircle size={16}/><span>{error}</span></div>}
        <button className="primary full" type="submit" disabled={working||status==='unavailable'}>{working?'Đang xác thực…':'Đăng nhập'}<ArrowRight size={16}/></button>
        <div className="login-foot"><LockKeyhole size={15}/> Không có tài khoản? Bạn vẫn có thể xem dashboard và chạy mô phỏng công khai mà không cần đăng nhập.</div>
        <button type="button" className="secondary full" onClick={onBack}>Quay lại bản demo công khai</button>
      </form>
    </div>
  </main>;
}
