import {BadRequestException,Body,ConflictException,Controller,ForbiddenException,Get,NotFoundException,Param,Post,Req,ServiceUnavailableException,UseGuards} from '@nestjs/common';
import {plainToInstance} from 'class-transformer';
import {validateSync} from 'class-validator';
import {Database} from '../../infrastructure/database';
import {JwtGuard} from '../../security/jwt.guard';
import {managerOnly,userFrom} from '../../shared/request-context';
import {CapacityLabDto,ShiftAllocationDto,SaveStudyDto,ReviewStudyDto} from '../../contracts/dto';
import {computeDemand} from '../../dss.engine';
import {optimizeCapacity} from '../../planning.engine';
import {analyzeDecisionRobustness} from '../../robustness.engine';
import {optimizeShiftAllocation} from '../../shift.engine';

function validated<T extends object>(dto:new()=>T,input:Record<string,unknown>):T{
  const value=plainToInstance(dto,input,{enableImplicitConversion:false});
  const errors=validateSync(value,{whitelist:true,forbidNonWhitelisted:true,forbidUnknownValues:true});
  if(errors.length)throw new BadRequestException('Invalid model inputs: '+errors.map(x=>x.property).join(', '));
  return value;
}

/**
 * Durable human-in-the-loop review for reproducible synthetic decision studies.
 * Never trust client-provided results: recompute and snapshot them on the server.
 */
@Controller('studies')
@UseGuards(JwtGuard)
export class StudyController {
  constructor(private db:Database){}

  private async department(){
    const item=await this.db.department.findFirst();
    if(!item)throw new ServiceUnavailableException('Synthetic department has not been seeded');
    return item;
  }

  @Post() async save(@Body() body:SaveStudyDto,@Req() req:any){
    const user=userFrom(req);
    if(user.role==='ADMIN')throw new ForbiddenException('System administrators cannot submit resource analyses');
    if(!body.name.trim())throw new BadRequestException('Analysis name is required');
    let output:unknown;
    let modelId:string;
    let snapshot:CapacityLabDto|ShiftAllocationDto;
    if(body.kind==='CAPACITY'){
      const input=validated(CapacityLabDto,body.input);
      const d=await this.department();
      try{
        const result=optimizeCapacity({
          demand:computeDemand(input.baselineDemand,input.growthPercent),
          currentDoctors:d.activeDoctors,
          availableDoctors:input.availableDoctors??d.availableDoctors,
          rooms:input.rooms??d.rooms,
          visitsPerDoctor:input.visitsPerDoctor??d.visitsPerDoctor,
          extraDoctorCost:input.extraDoctorCost??d.extraDoctorCost,
          targetUtilizationPercent:input.targetUtilizationPercent
        });
        output={...result,robustness:analyzeDecisionRobustness(result.inputs,result.recommended.doctors),persisted:true};
      }catch(e){throw new BadRequestException(e instanceof Error?e.message:'Invalid capacity assumptions');}
      modelId='optimization.capacity-enumeration';
      snapshot=input;
    }else if(body.kind==='SHIFT'){
      const input=validated(ShiftAllocationDto,body.input);
      try{output={...optimizeShiftAllocation(input),persisted:true};}
      catch(e){throw new BadRequestException(e instanceof Error?e.message:'Invalid shift assumptions');}
      modelId='optimization.shift-slot-enumeration';
      snapshot=input;
    }else throw new BadRequestException('Unknown study type');
    const record=await this.db.decisionStudy.create({
      data:{
        kind:body.kind,name:body.name.trim(),authorId:user.id,modelId,modelVersion:'1.0.0',
        inputSnapshot:JSON.parse(JSON.stringify(snapshot)),
        outputSnapshot:JSON.parse(JSON.stringify(output))
      },
      include:{author:{select:{name:true,role:true}},review:true}
    });
    return record;
  }

  @Get() async list(){
    return this.db.decisionStudy.findMany({
      orderBy:{createdAt:'desc'},take:50,
      include:{author:{select:{name:true,role:true}},review:{include:{actor:{select:{name:true,role:true}}}}}
    });
  }

  @Get(':id') async details(@Param('id') id:string){
    const record=await this.db.decisionStudy.findUnique({
      where:{id},include:{author:{select:{name:true,role:true}},review:{include:{actor:{select:{name:true,role:true}}}}}
    });
    if(!record)throw new NotFoundException('Decision analysis not found');
    return record;
  }

  @Post(':id/review') async review(@Param('id') id:string,@Body() body:ReviewStudyDto,@Req() req:any){
    managerOnly(req);
    if(body.rationale.trim().length<10)throw new BadRequestException('At least 10 characters of rationale are required');
    const study=await this.db.decisionStudy.findUnique({where:{id},select:{id:true,review:{select:{id:true}}}});
    if(!study)throw new NotFoundException('Decision analysis not found');
    if(study.review)throw new ConflictException('Decision analysis is already finalized');
    try{
      return await this.db.studyReview.create({
        data:{studyId:id,actorId:userFrom(req).id,action:body.action,rationale:body.rationale.trim()},
        include:{actor:{select:{name:true,role:true}}}
      });
    }catch(e:any){
      if(e?.code==='P2002')throw new ConflictException('Decision analysis is already finalized');
      throw e;
    }
  }
}
