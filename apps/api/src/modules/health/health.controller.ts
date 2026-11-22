import {Controller,Get} from '@nestjs/common';
import {Database} from '../../infrastructure/database';

@Controller()
export class HealthController {
  constructor(private db:Database){}
  @Get('health') async health(){await this.db.$queryRaw`SELECT 1`;return {status:'ok',synthetic:true};}
}
