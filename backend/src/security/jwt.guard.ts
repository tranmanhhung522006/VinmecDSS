import {Injectable,CanActivate,ExecutionContext,UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {Database} from '../infrastructure/database';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt:JwtService,private db:Database){}
  async canActivate(context:ExecutionContext){
    const req=context.switchToHttp().getRequest();
    const match=/^Bearer (\S+)$/.exec(String(req.headers.authorization||''));
    if(!match)throw new UnauthorizedException('Missing bearer token');
    try {const claim=await this.jwt.verifyAsync<{sub:string}>(match[1]);
      const user=await this.db.user.findUnique({where:{id:claim.sub}});
      if(!user||!user.active)throw new UnauthorizedException();
      req.user={id:user.id,email:user.email,role:user.role}; return true;
    } catch {throw new UnauthorizedException('Invalid or expired session');}
  }
}
