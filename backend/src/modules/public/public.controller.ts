import {Controller,Get,Post,Body,BadRequestException,ServiceUnavailableException} from '@nestjs/common';
import {Database} from '../../infrastructure/database';
import {ForecastDto,ScenarioDto,CapacityLabDto} from '../../contracts/dto';
import {parseDate} from '../../shared/request-context';
import {compareAlternatives,computeDemand,forecastByWeekday} from '../../dss.engine';
import {optimizeCapacity} from '../../planning.engine';
import {analyzeDecisionRobustness} from '../../robustness.engine';
import {rollingForecastBacktest} from '../../forecast.metrics';
import {getModelCatalog} from '../../models/model.catalog';

@Controller('public')
export class PublicController {
  constructor(private db: Database) {}
  private async department(){const d=await this.db.department.findFirst();if(!d)throw new ServiceUnavailableException('Database not initialized');return d;}
  @Get('model-catalog') modelCatalog(){return getModelCatalog();}
  @Get('summary') async summary(){
    const d=await this.department();
    const records=await this.db.visitAggregate.findMany({where:{departmentId:d.id},orderBy:{day:'asc'}});
    const values=new Map<string,number>();
    for(const v of records){const day=v.day.toISOString().slice(0,10);values.set(day,(values.get(day)||0)+v.visits);}
    const daily=Array.from(values,([day,visits])=>({day,visits})).slice(-14);
    const latestRecordedVisits=daily.at(-1)?.visits??0;
    return {department:{name:d.name,activeDoctors:d.activeDoctors,availableDoctors:d.availableDoctors,rooms:d.rooms,visitsPerDoctor:d.visitsPerDoctor,extraDoctorCost:d.extraDoctorCost},latestRecordedVisits,
      capacity:d.activeDoctors*d.visitsPerDoctor,utilizationPercent:Math.round(latestRecordedVisits/(d.activeDoctors*d.visitsPerDoctor)*1000)/10,daily,
      disclaimer:'Synthetic demonstration data. Not actual Vinmec operations.'};
  }
  @Get('forecast-quality') async forecastQuality(){
    const d=await this.department();
    const records=await this.db.visitAggregate.findMany({where:{departmentId:d.id},orderBy:{day:'asc'}});
    const byDate=new Map<string,{day:Date;visits:number}>();
    for(const record of records){
      const key=record.day.toISOString().slice(0,10);
      const current=byDate.get(key);
      byDate.set(key,{day:record.day,visits:(current?.visits??0)+record.visits});
    }
    return {...rollingForecastBacktest([...byDate.values()]),synthetic:true};
  }
  @Post('forecast') async forecast(@Body() input:ForecastDto){
    const d=await this.department(),targetDay=parseDate(input.targetDay);
    const records=await this.db.visitAggregate.findMany({where:{departmentId:d.id,day:{lt:targetDay}}});
    const aggregate=new Map<string,{day:Date,visits:number}>();
    for(const v of records){const key=v.day.toISOString().slice(0,10);const old=aggregate.get(key);aggregate.set(key,{day:v.day,visits:(old?.visits??0)+v.visits});}
    try {return {...forecastByWeekday(targetDay,Array.from(aggregate.values())),targetDay:input.targetDay,synthetic:true};}
    catch {throw new BadRequestException('No historical data before selected date');}
  }
  @Post('evaluate') async evaluate(@Body() input:ScenarioDto){
    const d=await this.department();parseDate(input.targetDay);
    const demand=computeDemand(input.baselineDemand,input.growthPercent);
    const assumptions={currentDoctors:d.activeDoctors,availableDoctors:d.availableDoctors,rooms:d.rooms,visitsPerDoctor:d.visitsPerDoctor,extraDoctorCost:d.extraDoctorCost};
    const result=compareAlternatives(demand,assumptions);
    return {id:'public-preview',title:input.title,targetDay:input.targetDay,baselineDemand:input.baselineDemand,growthPercent:input.growthPercent,demand,assumptions,alternatives:result.alternatives,
      recommendation:{recommended:result.recommended,criteria:result.criteria},decision:null,createdAt:new Date().toISOString(),synthetic:true,persisted:false};
  }
  @Post('capacity-lab') async capacityLab(@Body() input:CapacityLabDto){
    const d=await this.department();
    const demand=computeDemand(input.baselineDemand,input.growthPercent);
    const options=optimizeCapacity({
      demand,currentDoctors:d.activeDoctors,
      availableDoctors:input.availableDoctors??d.availableDoctors,
      rooms:input.rooms??d.rooms,
      visitsPerDoctor:input.visitsPerDoctor??d.visitsPerDoctor,
      extraDoctorCost:input.extraDoctorCost??d.extraDoctorCost,
      targetUtilizationPercent:input.targetUtilizationPercent
    });
    return {...options,robustness:analyzeDecisionRobustness(options.inputs,options.recommended.doctors),departmentName:d.name,baselineDemand:input.baselineDemand,growthPercent:input.growthPercent};
  }

}
