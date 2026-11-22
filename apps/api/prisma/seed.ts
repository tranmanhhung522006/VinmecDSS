import 'dotenv/config';
import {PrismaClient,Role} from '@prisma/client';
import {hash} from 'bcryptjs';
const db=new PrismaClient();
// ONLY synthetic and anonymous aggregates. Absolutely no real patient data.
async function main(){
  const dep=await db.department.upsert({where:{name:'Outpatient Operations — Simulated Vinmec Times City'},update:{},create:{name:'Outpatient Operations — Simulated Vinmec Times City',activeDoctors:8,availableDoctors:10,rooms:10,visitsPerDoctor:30,extraDoctorCost:900000}});
  const users:[string,string,Role][]=[
    ['manager@demo.local','Hospital Manager','MANAGER'],
    ['coordinator@demo.local','Operations Coordinator','COORDINATOR'],
    ['analyst@demo.local','Data Analyst','ANALYST'],
    ['admin@demo.local','System Administrator','ADMIN']
  ];
  const password=process.env.DEMO_PASSWORD||'VinmecDemo2026!';
  for(const [email,name,role] of users) await db.user.upsert({where:{email},update:{},create:{email,name,role,passwordHash:await hash(password,10)}});
  const anchor=new Date('2026-11-23T00:00:00Z');
  for(let ago=56;ago>=1;ago--){
    const day=new Date(anchor);day.setUTCDate(day.getUTCDate()-ago);
    const weekDay=day.getUTCDay();
    const weekdayFactor=weekDay===0?.60:weekDay===6?.75:weekDay===1?1.12:1;
    const base=Math.round((176 + (ago%9)*3 + ((ago*17)%21))*weekdayFactor);
    for(const [slot,factor] of [['08:00-12:00',.56],['13:00-17:00',.44]] as const){
      await db.visitAggregate.upsert({where:{departmentId_day_slot:{departmentId:dep.id,day,slot}},update:{},create:{departmentId:dep.id,day,slot,visits:Math.round(base*factor)}});
    }
  }
  console.log('Seed completed. Users:',users.map(u=>u[0]).join(', '));
  console.log('Demo password:',password);
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>db.$disconnect());