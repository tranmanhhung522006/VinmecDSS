import {forecastByWeekday} from './dss.engine';

export type ValidationSummary = {
  sampleCount:number;
  mae:number|null;
  mape:number|null;
  rmse:number|null;
  bias:number|null;
  model:string;
  message:string;
};

/** Walk-forward validation: every prediction uses observations strictly before its target. */
export function rollingForecastBacktest(input:Array<{day:Date;visits:number}>):ValidationSummary{
  const rows=[...input].filter(v=>v.day instanceof Date && !Number.isNaN(v.day.getTime()) && Number.isFinite(v.visits) && v.visits>=0)
    .sort((a,b)=>a.day.getTime()-b.day.getTime());
  if(rows.length<8)return {sampleCount:0,mae:null,mape:null,rmse:null,bias:null,model:'WEEKDAY_MEAN_4 / MOVING_AVERAGE_7',message:'At least 8 chronological daily observations are needed for backtesting.'};
  const errors:number[]=[],actuals:number[]=[];
  const first=Math.max(7,rows.length-21);
  for(let i=first;i<rows.length;i++){
    const prior=rows.slice(0,i);
    const forecast=forecastByWeekday(rows[i].day,prior);
    errors.push(forecast.predictedVisits-rows[i].visits);
    actuals.push(rows[i].visits);
  }
  const n=errors.length;
  const abs=errors.reduce((sum,x)=>sum+Math.abs(x),0)/n;
  const rmse=Math.sqrt(errors.reduce((sum,x)=>sum+x*x,0)/n);
  const bias=errors.reduce((sum,x)=>sum+x,0)/n;
  const valid=errors.map((e,i)=>actuals[i]>0?Math.abs(e)/actuals[i]*100:null).filter((x):x is number=>x!==null);
  const round=(v:number)=>Math.round(v*10)/10;
  return {sampleCount:n,mae:round(abs),mape:valid.length?round(valid.reduce((a,b)=>a+b,0)/valid.length):null,
    rmse:round(rmse),bias:round(bias),model:'WEEKDAY_MEAN_4 / MOVING_AVERAGE_7',
    message:'Evaluated '+n+' recent chronological holdout days; each forecast used only earlier records.'};
}
