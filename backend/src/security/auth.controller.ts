import {Controller,Get,Post,Body,Req,UseGuards,UnauthorizedException,ForbiddenException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {compare} from 'bcryptjs';
import {randomUUID} from 'node:crypto';
import {LoginFailureLimiter,normalizeLoginEmail} from '../auth.logic';
import {Database} from '../infrastructure/database';
import {LoginDto} from '../contracts/dto';
import {JwtGuard} from './jwt.guard';
import {tokenDigest} from './session.logic';

const SESSION_MS=8*60*60*1000;

@Controller('auth')
export class AuthController {
  constructor(private db:Database,private jwt:JwtService){}
  private readonly attempts=new LoginFailureLimiter(10,15*60*1000);

  @Get('status') async status(){
    const staffAccounts=await this.db.user.count({where:{active:true}});
    return {staffLoginAvailable:staffAccounts>0,publicPreviewAvailable:true};
  }

  @Post('login') async login(@Body() input:LoginDto,@Req() req:any){
    const ip=String(req.ip||req.socket?.remoteAddress||'unknown');
    const email=normalizeLoginEmail(input.email);
    const rateKey=ip+':'+email;
    if(this.attempts.isBlocked(rateKey))throw new ForbiddenException('Too many failed sign-in attempts. Try again after 15 minutes.');
    const user=await this.db.user.findUnique({where:{email}});
    if(!user||!user.active||!await compare(input.password,user.passwordHash)){
      this.attempts.recordFailure(rateKey);
      throw new UnauthorizedException('Incorrect email or password');
    }
    this.attempts.recordSuccess(rateKey);
    const token=await this.jwt.signAsync({sub:user.id,jti:randomUUID()},{expiresIn:'8h'});
    await this.db.authSession.create({data:{
      userId:user.id,tokenHash:tokenDigest(token),expiresAt:new Date(Date.now()+SESSION_MS)
    }});
    return {accessToken:token,user:{name:user.name,email:user.email,role:user.role}};
  }

  @Post('logout')
  @UseGuards(JwtGuard)
  async logout(@Req() req:any){
    const token=String(req.headers.authorization).slice(7);
    // Idempotent revocation: never disclose other sessions or a token digest.
    await this.db.authSession.updateMany({
      where:{tokenHash:tokenDigest(token),userId:req.user.id,revokedAt:null},
      data:{revokedAt:new Date()}
    });
    return {revoked:true};
  }
}
