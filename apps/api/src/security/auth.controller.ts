import {Controller,Get,Post,Body,Req,UnauthorizedException,ForbiddenException} from '@nestjs/common';
import {JwtService} from '@nestjs/jwt';
import {compare} from 'bcryptjs';
import {LoginFailureLimiter,normalizeLoginEmail} from '../auth.logic';
import {Database} from '../infrastructure/database';
import {LoginDto} from '../contracts/dto';

@Controller('auth')
export class AuthController {
  constructor(private db:Database,private jwt:JwtService){}
  private readonly attempts=new LoginFailureLimiter(10,15*60*1000);
  @Get('status') async status(){
    // Configuration-only diagnostics. Do not disclose user names, emails or passwords.
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
    return {accessToken:await this.jwt.signAsync({sub:user.id},{expiresIn:'8h'}),user:{name:user.name,email:user.email,role:user.role}};
  }
}
// Public visitors can explore genuine server-side calculations without logging in.
// These endpoints never persist user input and never invoke a paid model.
