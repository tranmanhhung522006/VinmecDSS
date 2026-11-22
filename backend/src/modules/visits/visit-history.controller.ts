import {Body,Controller,ForbiddenException,Get,Post,Req,UseGuards,BadRequestException,NotFoundException} from '@nestjs/common';
import {Database} from '../../infrastructure/database';
import {JwtGuard} from '../../security/jwt.guard';
import {SaveVisitHistoryDto} from '../../contracts/dto';
import {userFrom} from '../../shared/request-context';
import {AFTERNOON_SLOT,MORNING_SLOT,isValidObservedDay,listVisitHistory} from './visit-history.service';

@Controller('visit-history')
@UseGuards(JwtGuard)
export class VisitHistoryController {
  constructor(private db:Database){}
  @Get() list(){return listVisitHistory(this.db);}

  @Get('changes')
  async changes(@Req() req:any){
    if(!['MANAGER','ADMIN'].includes(userFrom(req).role))throw new ForbiddenException('Only managers and administrators may inspect history changes');
    const changes=await this.db.visitHistoryChange.findMany({
      take:100,orderBy:{createdAt:'desc'},
      select:{id:true,day:true,beforeMorning:true,beforeAfternoon:true,afterMorning:true,afterAfternoon:true,reason:true,createdAt:true,
        actor:{select:{name:true,role:true}}}
    });
    return {changes,synthetic:true};
  }

  @Post()
  async save(@Body() body:SaveVisitHistoryDto,@Req() req:any){
    const user=userFrom(req);
    if(!['ADMIN','MANAGER'].includes(user.role))throw new ForbiddenException('Only Manager or Admin can update historical aggregate visits');
    if(!isValidObservedDay(body.day))throw new BadRequestException('Ngày ghi nhận phải hợp lệ và không được sau ngày hiện tại (Việt Nam)');
    if(body.morningVisits+body.afternoonVisits>100000)throw new BadRequestException('Tổng lượt khám mỗi ngày không được vượt 100.000');
    const reason=(body.reason??'').trim();
    const day=new Date(body.day+'T00:00:00.000Z');
    const department=await this.db.department.findFirst({orderBy:{name:'asc'}});
    if(!department)throw new NotFoundException('Database chưa được khởi tạo');
    const id=department.id;
    return this.db.$transaction(async tx=>{
      const before=await tx.visitAggregate.findMany({where:{departmentId:id,day}});
      const oldMorning=before.find(row=>row.slot===MORNING_SLOT)?.visits??null;
      const oldAfternoon=before.find(row=>row.slot===AFTERNOON_SLOT)?.visits??null;
      const unchanged=oldMorning===body.morningVisits&&oldAfternoon===body.afternoonVisits;
      if(unchanged)return {day:body.day,morningVisits:body.morningVisits,afternoonVisits:body.afternoonVisits,
        totalVisits:body.morningVisits+body.afternoonVisits,updated:false,synthetic:true};
      await tx.visitAggregate.upsert({where:{departmentId_day_slot:{departmentId:id,day,slot:MORNING_SLOT}},
        update:{visits:body.morningVisits},create:{departmentId:id,day,slot:MORNING_SLOT,visits:body.morningVisits}});
      await tx.visitAggregate.upsert({where:{departmentId_day_slot:{departmentId:id,day,slot:AFTERNOON_SLOT}},
        update:{visits:body.afternoonVisits},create:{departmentId:id,day,slot:AFTERNOON_SLOT,visits:body.afternoonVisits}});
      await tx.visitHistoryChange.create({data:{departmentId:id,actorId:user.id,day,
        beforeMorning:oldMorning,beforeAfternoon:oldAfternoon,
        afterMorning:body.morningVisits,afterAfternoon:body.afternoonVisits,reason}});
      return {day:body.day,morningVisits:body.morningVisits,afternoonVisits:body.afternoonVisits,
        totalVisits:body.morningVisits+body.afternoonVisits,updated:true,synthetic:true};
    });
  }
}
