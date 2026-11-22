import {Module} from '@nestjs/common';
import {JwtModule} from '@nestjs/jwt';
import {Database} from './infrastructure/database';
import {JwtGuard} from './security/jwt.guard';
import {AuthController} from './security/auth.controller';
import {PublicController} from './modules/public/public.controller';
import {HealthController} from './modules/health/health.controller';
import {DssController} from './modules/decisions/dss.controller';
import {StudyController} from './modules/studies/study.controller';

/** Composition root. Keep delivery and domain logic outside the root module. */
@Module({
  imports:[JwtModule.registerAsync({useFactory:()=>({secret:process.env.JWT_SECRET,signOptions:{issuer:'vinmec-dss-demo'}})})],
  controllers:[HealthController,PublicController,AuthController,DssController,StudyController],
  providers:[Database,JwtGuard]
})
export class AppModule{}
