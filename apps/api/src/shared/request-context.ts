import {BadRequestException,ForbiddenException} from '@nestjs/common';
import type {Role} from '@prisma/client';

export function parseDate(raw:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new BadRequestException('Expected date YYYY-MM-DD');const d=new Date(raw+'T00:00:00.000Z');if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==raw)throw new BadRequestException('Invalid date');return d;}
export function userFrom(req:any):{id:string,role:Role,email:string}{return req.user;}
export function managerOnly(req:any){if(userFrom(req).role!=='MANAGER')throw new ForbiddenException('Only hospital managers can approve or reject a decision');}
