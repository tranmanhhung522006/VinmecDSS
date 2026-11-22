import {useMemo} from 'react';
import {AlertTriangle, ArrowDownRight, ArrowUpRight, BadgeCheck, CalendarDays, Gauge, TrendingUp} from 'lucide-react';
import {Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis} from 'recharts';

type DailyVisit = {day:string;visits:number};
type Alternative = {doctors:number;capacity:number;gap:number;surplus:number;utilizationPercent:number;addedCostVnd:number;eligible:boolean;servesDemand:boolean;score:number};
export type ForecastQuality = {sampleCount:number;mae:number|null;mape:number|null;rmse:number|null;bias:number|null;model:string;message:string};

const format = (value:number) => new Intl.NumberFormat('en-US').format(value);
const percent = (value:number) => (value > 0 ? '+' : '') + value.toFixed(1) + '%';

export function DemandPulse({daily,capacity}:{daily:DailyVisit[];capacity:number}){
  const metrics=useMemo(()=>{
    const values=daily.map(item=>item.visits);
    const recent=values.slice(-7),prior=values.slice(-14,-7);
    const avg=recent.length?recent.reduce((a,b)=>a+b,0)/recent.length:0;
    const prev=prior.length?prior.reduce((a,b)=>a+b,0)/prior.length:0;
    const change=prev?((avg-prev)/prev)*100:null;
    const overCapacity=recent.filter(n=>n>capacity).length;
    const peak=recent.length?Math.max(...recent):0;
    return {avg,change,overCapacity,peak,count:recent.length};
  },[daily,capacity]);
  if(!metrics.count)return <div className="card panel pulse-panel"><h2>Demand monitoring</h2><p className="muted">No synthetic history is available yet.</p></div>;
  return <section className="card panel pulse-panel" aria-label="Operational demand indicators">
    <div className="pulse-heading"><div><div className="micro">OPERATIONAL SIGNALS</div><h2>Demand monitoring</h2><p className="muted">Rolling 7-day view of the synthetic outpatient dataset</p></div><span className="pulse-chip"><CalendarDays size={14}/>Last {metrics.count} days</span></div>
    <div className="pulse-grid">
      <div className="pulse-metric"><span>Daily average</span><strong>{format(Math.round(metrics.avg))}<small> visits</small></strong><div className="pulse-sub">Most recent 7 recorded days</div></div>
      <div className="pulse-metric"><span>Change vs prior week</span><strong className={metrics.change!==null&&metrics.change>0?'pulse-warn':''}>{metrics.change===null?'—':percent(metrics.change)}</strong><div className="pulse-sub">{metrics.change===null?'Insufficient prior-week data':<>{metrics.change>0?<ArrowUpRight size={13}/:<ArrowDownRight size={13}/>} 7-day average comparison</>}</div></div>
      <div className="pulse-metric"><span>Peak recorded demand</span><strong>{format(metrics.peak)}<small> visits</small></strong><div className="pulse-sub">Latest seven days</div></div>
      <div className="pulse-metric"><span>Days above capacity</span><strong className={metrics.overCapacity?'pulse-warn':''}>{metrics.overCapacity} <small>/ {metrics.count}</small></strong><div className="pulse-sub">{metrics.overCapacity?<AlertTriangle size={13}/>:<BadgeCheck size={13}/>} Historical capacity check</div></div>
    </div>
  </section>;
}

export function ScenarioCapacityChart({alternatives,demand,recommendedDoctors}:{alternatives:Alternative[];demand:number;recommendedDoctors:number|null}){
  const points=alternatives.map(a=>({label:String(a.doctors)+' doctors',capacity:a.capacity,eligible:a.eligible,doctors:a.doctors}));
  return <section className="capacity-panel" aria-label="Compare capacity against demand">
    <div className="panel-head"><div><h3>Capacity versus demand</h3><p className="muted">Dashed line = simulated demand · Only eligible options can be recommended</p></div><span className="chart-legend"><span/> Clinic capacity</span></div>
    <div className="capacity-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={points} margin={{top:10,right:12,left:-12,bottom:4}} barCategoryGap="34%">
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf0f3"/>
      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill:'#64748b',fontSize:11}}/>
      <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:'#8395a3',fontSize:11}}/>
      <Tooltip formatter={value=>[format(Number(value))+' visits','Capacity']} />
      <ReferenceLine y={demand} stroke="#c16d39" strokeDasharray="5 5" ifOverflow="extendDomain" />
      <Bar dataKey="capacity" fill="#4689a0" radius={[5,5,0,0]} maxBarSize={65}/>
    </BarChart></ResponsiveContainer></div>
    <div className="capacity-foot"><span><Gauge size={15}/> Target: <strong>{format(demand)} visits</strong></span><span><TrendingUp size={15}/> Suggested: <strong>{recommendedDoctors===null?'No eligible option':recommendedDoctors+' doctors'}</strong></span></div>
    {alternatives.some(a=>!a.eligible)&&<p className="tiny muted capacity-caveat">Options exceeding available doctors or clinic rooms remain visible for comparison but are not eligible for approval.</p>}
  </section>;
}

export function ForecastQualityCard({quality}:{quality:ForecastQuality|null}){
  return <section className="card panel quality-panel" aria-label="Forecast backtesting metrics">
    <div className="panel-head"><div><div className="micro">MODEL VALIDATION</div><h2>Historical forecast accuracy</h2><p className="muted">Walk-forward validation on synthetic, held-out dates</p></div><BadgeCheck size={20} className="muted"/></div>
    {!quality?<p className="muted">Loading model evaluation…</p>:quality.sampleCount===0?<p className="muted">{quality.message}</p>:<>
      <div className="quality-grid">
        <div><span>MAE</span><strong>{quality.mae?.toFixed(1)??'—'}</strong><small>visits</small></div>
        <div><span>MAPE</span><strong>{quality.mape===null?'N/A':quality.mape.toFixed(1)+'%'}</strong><small>nonzero actuals</small></div>
        <div><span>RMSE</span><strong>{quality.rmse?.toFixed(1)??'—'}</strong><small>visits</small></div>
        <div><span>Holdout days</span><strong>{quality.sampleCount}</strong><small>rolling tests</small></div>
      </div>
      <p className="tiny muted quality-note">{quality.message} These statistics do not establish suitability for real hospital operations.</p>
    </>}
  </section>;
}
