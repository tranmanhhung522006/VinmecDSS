import {useState,type FormEvent} from 'react';
import {BarChart3,CalendarDays,ShieldAlert} from 'lucide-react';
import {request} from '../lib/api';

type Model='WEEKDAY_MEAN_4'|'TRAILING_MEAN_7'|'EXP_SMOOTHING_035';
type Score={model:Model;sampleCount:number;mae:number;rmse:number;mape:number|null;bias:number;absoluteErrorP90:number};
type ForecastComparison={evaluatedDays:number;trainingDays:number;preferredModel:Model;models:Score[];
  prediction:{targetDay:string;predictedVisits:number;intervalLow:number;intervalHigh:number;intervalLabel:string;model:Model};
  warnings:string[];synthetic:true};
const labels:Record<Model,string>={
  WEEKDAY_MEAN_4:'Trung bình cùng thứ (4 tuần)',
  TRAILING_MEAN_7:'Trung bình trượt (7 ngày)',
  EXP_SMOOTHING_035:'San bằng mũ đơn (α = 0,35)'
};
const fmt=(n:number)=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(n);
export default function ForecastComparisonPanel(){
  const [date,setDate]=useState(()=>{
    const next=new Date();next.setDate(next.getDate()+1);
    return new Date(next.getTime()-next.getTimezoneOffset()*60000).toISOString().slice(0,10);
  });
  const [result,setResult]=useState<ForecastComparison|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  async function evaluate(event:FormEvent){
    event.preventDefault();setLoading(true);setError('');setResult(null);
    try{setResult(await request<ForecastComparison>('/public/forecast-comparison','POST',{targetDay:date}));}
    catch(e){setError(e instanceof Error?e.message:'Không thể so sánh mô hình');}
    finally{setLoading(false);}
  }
  return <section className="card panel forecast-comparison" aria-label="So sánh mô hình dự báo">
    <div className="panel-head"><div><div className="micro">FORECAST MODEL EVALUATION</div><h2>So sánh phương pháp dự báo</h2>
      <p className="muted">Ba mô hình cơ sở được đánh giá trên cùng các ngày kiểm chứng quá khứ. Chỉ sử dụng dữ liệu tổng hợp giả lập trước ngày mục tiêu.</p></div><BarChart3 size={21} className="muted"/></div>
    <form className="forecast-compare-form" onSubmit={evaluate}>
      <label className="field">Ngày dự báo<input required type="date" value={date} onChange={e=>{setDate(e.target.value);setResult(null)}}/></label>
      <button className="primary" type="submit" disabled={loading}>{loading?'Đang so sánh…':'Chạy so sánh mô hình'} <CalendarDays size={15}/></button>
    </form>
    {error&&<p className="lab-error" role="alert">{error}</p>}
    {result&&<>
      <div className="forecast-compare-highlight"><div><span>Mô hình được chọn theo MAE</span><strong>{labels[result.preferredModel]}</strong></div>
        <div><span>Nhu cầu dự báo</span><strong>{fmt(result.prediction.predictedVisits)} lượt</strong></div>
        <div><span>Biên độ minh họa theo sai số lịch sử</span><strong>{fmt(result.prediction.intervalLow)}–{fmt(result.prediction.intervalHigh)} lượt</strong></div></div>
      <div className="table-wrap"><table><thead><tr><th>Mô hình</th><th>MAE</th><th>RMSE</th><th>MAPE</th><th>Bias</th><th>Đánh giá</th></tr></thead>
        <tbody>{result.models.map(m=><tr key={m.model}><td><strong>{labels[m.model]}</strong></td><td>{fmt(m.mae)}</td><td>{fmt(m.rmse)}</td><td>{m.mape===null?'N/A':fmt(m.mape)+'%'}</td><td>{fmt(m.bias)}</td>
          <td>{m.model===result.preferredModel?<strong>Được chọn</strong>:'Tham chiếu'}</td></tr>)}</tbody></table></div>
      <p className="lab-caption">Dữ liệu dùng để học: {result.trainingDays} ngày; số ngày backtest: {result.evaluatedDays}. Biên độ trên không phải khoảng tin cậy dự báo đã hiệu chuẩn.</p>
      <div className="lab-robust-notes">{result.warnings.map(w=><p key={w}><ShieldAlert size={14}/>{w}</p>)}</div>
    </>}
  </section>;
}
