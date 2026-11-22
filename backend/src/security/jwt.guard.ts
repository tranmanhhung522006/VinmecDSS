import {Injectable,CanActivate,ExecutionContext,UnauthorizedException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {Database} from '../infrastructure/database';
import {sessionIsValid,tokenDigest} from './session.logic';

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(private jwt:JwtService,private db:Database){}
  async canActivate(context:ExecutionContext){
    const req=context.switchToHttp().getRequest();
    const match=/^Bearer (\S+)$/.exec(String(req.headers.authorization||''));
    if(!match)throw new UnauthorizedException('Missing bearer token');
    try {
      const claims=await this.jwt.verifyAsync<{sub:string;jti:string}>(match[1]);
      if(!claims.sub||!claims.jti)throw new UnauthorizedException();
      const session=await this.db.authSession.findUnique({where:{tokenHash:tokenDigest(match[1])}});
      if(!session||session.userId!==claims.sub||!sessionIsValid(session,match[1]))
        throw new UnauthorizedException('Session was revoked or expired');
      const user=await this.db.user.findUnique({where:{id:claims.sub}});
      if(!user||!user.active)throw new UnauthorizedException();
      req.user={id:user.id,email:user.email,role:user.role};
      return true;
    }catch{
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
