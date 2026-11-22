export type StaffRole='MANAGER'|'COORDINATOR'|'ANALYST'|'ADMIN';
export type StaffUser={name:string;email:string;role:StaffRole};
export type Session={token:string;user:StaffUser};

export class ApiError extends Error {
  constructor(message:string,public readonly status:number){super(message);this.name='ApiError';}
}
export async function request<T>(path:string,method='GET',body?:unknown,token?:string):Promise<T>{
  let response:Response;
  try{
    response=await fetch('/api'+path,{
      method,cache:'no-store',
      headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},
      body:body===undefined?undefined:JSON.stringify(body)
    });
  }catch{throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra đường truyền hoặc thử lại sau.',0);}
  const data:unknown=await response.json().catch(()=>null);
  if(!response.ok){
    const raw=(data && typeof data==='object' && 'message' in data)?(data as {message:unknown}).message:undefined;
    const detail=Array.isArray(raw)?raw.join('; '):typeof raw==='string'?raw:'';
    if(response.status===401)throw new ApiError(path==='/auth/login'?'Email hoặc mật khẩu chưa đúng. Hãy kiểm tra lại tài khoản được cấp.':'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',401);
    if(response.status===403)throw new ApiError(detail||'Bạn không được cấp quyền thực hiện thao tác này.',403);
    if(response.status>=500)throw new ApiError('Dịch vụ đang gặp sự cố. Vui lòng thử lại sau hoặc kiểm tra trạng thái backend.',response.status);
    throw new ApiError(detail||'Yêu cầu không thành công (HTTP '+response.status+').',response.status);
  }
  if(data===null)throw new ApiError('Máy chủ trả về dữ liệu không hợp lệ.',502);
  return data as T;
}
const SESSION_KEY='dss_session';
export function loadSession():Session|null{
  try{
    const raw=sessionStorage.getItem(SESSION_KEY);
    if(!raw)return null;
    const value:unknown=JSON.parse(raw);
    if(!value||typeof value!=='object'||!('token' in value)||!('user' in value))return null;
    const object=value as {token:unknown;user:unknown};
    if(typeof object.token!=='string'||!object.token||!object.user||typeof object.user!=='object')return null;
    const user=object.user as Record<string,unknown>;
    if(typeof user.name!=='string'||typeof user.email!=='string'||!['MANAGER','COORDINATOR','ANALYST','ADMIN'].includes(String(user.role)))return null;
    return {token:object.token,user:user as StaffUser};
  }catch{return null;}
}
export function saveSession(value:Session):void{try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(value));}catch{/* browsing in restricted mode */}}
export function clearSession():void{try{sessionStorage.removeItem(SESSION_KEY);}catch{/* browsing in restricted mode */}}
