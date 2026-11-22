import {createHash,timingSafeEqual} from 'node:crypto';

/** Store only an irreversible digest of an issued access token. */
export function tokenDigest(token:string):string{
  return createHash('sha256').update(token,'utf8').digest('hex');
}
export type SessionRecord={expiresAt:Date;revokedAt:Date|null;tokenHash:string};
export function sessionIsValid(session:SessionRecord|null|undefined,token:string,at=new Date()):boolean{
  if(!session||session.revokedAt!==null||!(session.expiresAt instanceof Date)||session.expiresAt.getTime()<=at.getTime())return false;
  if(typeof session.tokenHash!=='string'||!/^[0-9a-f]{64}$/.test(session.tokenHash))return false;
  const actual=Buffer.from(tokenDigest(token),'hex');
  const stored=Buffer.from(session.tokenHash,'hex');
  return actual.length===stored.length&&timingSafeEqual(actual,stored);
}
