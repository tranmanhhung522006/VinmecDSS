/** Simple in-process limiter for the academic demonstration. Count failed attempts only.
 * Replace with a distributed store when running multiple API instances. */
export class LoginFailureLimiter {
  private readonly failures = new Map<string,{count:number;expiresAt:number}>();
  constructor(private readonly maxFailures=10,private readonly windowMs=15*60*1000){}
  isBlocked(key:string,at=Date.now()):boolean {
    const record=this.failures.get(key);
    if(!record)return false;
    if(record.expiresAt<=at){this.failures.delete(key);return false;}
    return record.count>=this.maxFailures;
  }
  recordFailure(key:string,at=Date.now()):void {
    const current=this.failures.get(key);
    const record=current&&current.expiresAt>at?current:{count:0,expiresAt:at+this.windowMs};
    record.count++;
    this.failures.set(key,record);
    if(this.failures.size>2000){
      for(const [candidate,value] of this.failures) if(value.expiresAt<=at)this.failures.delete(candidate);
    }
  }
  recordSuccess(key:string):void {this.failures.delete(key);}
}
export const normalizeLoginEmail=(email:string):string=>email.trim().toLowerCase();
