import {useEffect,useState} from 'react';
import {BookOpen,RefreshCw,ShieldCheck} from 'lucide-react';
import {request} from '../lib/api';

type ModelInfo={
  id:string;version:string;name:string;family:string;type:string;
  implementation:string;inputs:string[];outputs:string[];
  qualityControl:string;limitations:string;approvalAuthority:string
};
type Catalog={catalogVersion:string;classification:string;clinicalUseAllowed:boolean;models:ModelInfo[]};
export default function ModelCatalog(){
  const [data,setData]=useState<Catalog|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  async function load(){
    setLoading(true);setError('');
    try{setData(await request<Catalog>('/public/model-catalog'));}
    catch(e){setData(null);setError(e instanceof Error?e.message:'Không đọc được danh mục mô hình.');}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);
  return <section className="card panel model-catalog">
    <div className="panel-head"><div><div className="micro">MODEL MANAGEMENT / GOVERNANCE</div>
      <h2>Danh mục mô hình DSS</h2>
      <p className="muted">Hiển thị các thuật toán thực sự được triển khai, cách kiểm tra và những giới hạn của chúng.</p>
    </div><button type="button" className="secondary" disabled={loading} onClick={()=>void load()}><RefreshCw size={15}/> Tải lại</button></div>
    {loading&&!data&&<p className="muted">Đang đọc metadata mô hình từ backend…</p>}
    {error&&<div role="alert" className="alert error">{error}</div>}
    {data&&<>
      <div className="catalog-banner"><ShieldCheck size={17}/><span><strong>{data.models.length} mô hình / thành phần phân tích</strong> · Dữ liệu tổng hợp giả lập · {data.clinicalUseAllowed?'Được phép sử dụng lâm sàng':'Không được sử dụng trong hoạt động lâm sàng thực tế'}</span></div>
      <div className="catalog-grid">{data.models.map(item=><article key={item.id} className="catalog-item">
        <div className="catalog-top"><span>{item.family}</span><small>v{item.version}</small></div>
        <h3>{item.name}</h3><div className="catalog-type">{item.type==='OPTIONAL_LLM'?'AI hỗ trợ diễn giải':item.type==='STATISTICAL_BASELINE'?'Mô hình dự báo cơ sở':'Mô hình tính toán xác định'}</div>
        <dl><dt>Kiểm chứng</dt><dd>{item.qualityControl}</dd><dt>Giới hạn</dt><dd>{item.limitations}</dd></dl>
        <div className="catalog-source"><BookOpen size={13}/><code>{item.implementation}</code></div>
      </article>)}</div>
      <p className="tiny muted">Model Catalog mô tả các mô hình đang có trong source code; metadata không chứng minh mô hình đã được kiểm định lâm sàng.</p>
    </>}
  </section>;
}
