/**
 * Reproducible comparisons of three simple synthetic-demand forecasting baselines.
 * Holdout observations are excluded from every forecast to prevent look-ahead.
 * No statistical or clinical forecasting quality is implied.
 */
export type ForecastMethod='WEEKDAY_MEAN_4'|'TRAILING_MEAN_7'|'EXP_SMOOTHING_035';
export type DailyDemand={day:Date;visits:number};
export type ModelScore={
  model:ForecastMethod;sampleCount:number;mae:number;rmse:number;mape:number|null;
  bias:number;absoluteErrorP90:number;
};
export type ForecastComparison={
  evaluatedDays:number;trainingDays:number;preferredModel:ForecastMethod;
  models:ModelScore[];
  prediction:{targetDay:string;predictedVisits:number;intervalLow:number;intervalHigh:number;intervalLabel:string;model:ForecastMethod};
  warnings:string[];synthetic:true;
};

const METHODS:readonly ForecastMethod[]=['WEEKDAY_MEAN_4','TRAILING_MEAN_7','EXP_SMOOTHING_035'];
const round1=(n:number)=>Math.round(n*10)/10;
function validRows(input:DailyDemand[],targetDay:Date){
  if(!(targetDay instanceof Date)||Number.isNaN(targetDay.getTime()))throw new Error('Invalid target day');
  const rows=input.filter(r=>r.day instanceof Date&&!Number.isNaN(r.day.getTime())&&
    Number.isInteger(r.visits)&&r.visits>=0&&r.visits<=100000&&r.day.getTime()<targetDay.getTime())
    .sort((a,b)=>a.day.getTime()-b.day.getTime());
  // Distinct days only, to keep daily observations from being counted multiple times.
  const seen=new Set<number>();
  for(const row of rows){
    const date=row.day.getTime();
    if(seen.has(date))throw new Error('Duplicate daily observations');
    seen.add(date);
  }
  return rows;
}
export function forecastUsing(method:ForecastMethod,history:DailyDemand[],targetDay:Date):number{
  if(!history.length)throw new Error('Historical data required');
  const rows=[...history].filter(r=>r.day.getTime()<targetDay.getTime()).sort((a,b)=>a.day.getTime()-b.day.getTime());
  if(!rows.length)throw new Error('No prior observations');
  let value:number;
  if(method==='WEEKDAY_MEAN_4'){
    const weekday=rows.filter(r=>r.day.getUTCDay()===targetDay.getUTCDay()).slice(-4);
    const data=weekday.length>=2?weekday:rows.slice(-7);
    value=data.reduce((s,r)=>s+r.visits,0)/data.length;
  }else if(method==='TRAILING_MEAN_7'){
    const data=rows.slice(-7);
    value=data.reduce((s,r)=>s+r.visits,0)/data.length;
  }else if(method==='EXP_SMOOTHING_035'){
    value=rows[0].visits;
    for(const row of rows.slice(1))value=0.35*row.visits+0.65*value;
  }else throw new Error('Unsupported forecasting method');
  return Math.max(0,Math.round(value));
}
/**
 * Same holdout dates for all models. Select minimum MAE then RMSE, with stable
 * method ordering; equal validity of all synthetic historical observations.
 */
export function compareForecastModels(input:DailyDemand[],targetDay:Date):ForecastComparison{
  const rows=validRows(input,targetDay);
  if(rows.length<10)throw new Error('At least 10 chronological days before target are required');
  const start=Math.max(7,rows.length-21);
  const holdouts=rows.slice(start);
  const scores=METHODS.map(model=>{
    const err=holdouts.map((row,index)=>{
      const prediction=forecastUsing(model,rows.slice(0,start+index),row.day);
      return prediction-row.visits;
    });
    const n=err.length;
    const absolute=err.map(e=>Math.abs(e)).sort((a,b)=>a-b);
    const nonzero=err.map((e,index)=>holdouts[index].visits>0?
      Math.abs(e)/holdouts[index].visits*100:null).filter((v):v is number=>v!==null);
    return {
      model,sampleCount:n,mae:round1(absolute.reduce((a,b)=>a+b,0)/n),
      rmse:round1(Math.sqrt(err.reduce((a,b)=>a+b*b,0)/n)),
      mape:nonzero.length?round1(nonzero.reduce((a,b)=>a+b,0)/nonzero.length):null,
      bias:round1(err.reduce((a,b)=>a+b,0)/n),
      absoluteErrorP90:absolute[Math.max(0,Math.ceil(0.9*n)-1)]
    };
  });
  const ranked=[...scores].sort((a,b)=>a.mae-b.mae||a.rmse-b.rmse||METHODS.indexOf(a.model)-METHODS.indexOf(b.model));
  const preferred=ranked[0];
  const predictedVisits=forecastUsing(preferred.model,rows,targetDay);
  const width=preferred.absoluteErrorP90;
  return {
    evaluatedDays:holdouts.length,trainingDays:rows.length,preferredModel:preferred.model,
    models:scores,
    prediction:{
      targetDay:targetDay.toISOString().slice(0,10),
      predictedVisits,intervalLow:Math.max(0,predictedVisits-width),intervalHigh:predictedVisits+width,
      intervalLabel:'Illustrative ±90th percentile historical absolute error (not a calibrated prediction interval)',
      model:preferred.model
    },
    warnings:[
      'Các mô hình chỉ được so sánh trên cùng một chuỗi dữ liệu tổng hợp giả lập, không phải kết quả đánh giá thực tế tại bệnh viện.',
      'Biên độ sai số là phân vị 90% sai số tuyệt đối kiểm tra lịch sử, không phải khoảng dự báo có bảo đảm mức tin cậy.',
      'Mô hình chưa xét ngày lễ, mùa vụ dài hạn, chuyên khoa, mức độ bệnh hoặc thay đổi chính sách đặt lịch.'
    ],synthetic:true
  };
}
