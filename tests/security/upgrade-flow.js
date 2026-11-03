/* Chemin de mise à jour : un ancien administrateur / client / responsable se connecte sur le NOUVEAU code avec l'ANCIENNE base (migration automatique). Voir upgrade.sh. */
const crypto=require('crypto'); const B=process.env.BASE||'http://127.0.0.1:8096'; if(/symoprint\.com/.test(B)){console.error('REFUS : production');process.exit(2);}
function b32(s){const A='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits='',o=[];for(const c of s)bits+=A.indexOf(c).toString(2).padStart(5,'0');for(let i=0;i+8<=bits.length;i+=8)o.push(parseInt(bits.slice(i,i+8),2));return Buffer.from(o);}
function totp(sec,t=Date.now()){const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(Math.floor(t/30000)));const h=crypto.createHmac('sha1',b32(sec)).update(b).digest(),o=h[19]&15;return String((((h[o]&0x7f)<<24)|(h[o+1]<<16)|(h[o+2]<<8)|h[o+3])%1e6).padStart(6,'0');}
class C{constructor(){this.j={};}async r(m,p,f){const h={};const ck=Object.entries(this.j).map(([k,v])=>k+'='+v).join('; ');if(ck)h.Cookie=ck;let body;if(f){body=new URLSearchParams(f);h['Content-Type']='application/x-www-form-urlencoded';}
 const res=await fetch(B+p,{method:m,headers:h,body,redirect:'manual'});for(const c of res.headers.getSetCookie()){const [kv]=c.split(';');const i=kv.indexOf('=');this.j[kv.slice(0,i)]=kv.slice(i+1);}return {s:res.status,loc:res.headers.get('location')||'',b:await res.text()};}
 async csrf(p='/contact'){const r=await this.r('GET',p);return (r.b.match(/data-csrf="([a-f0-9]+)"/)||r.b.match(/name="_csrf" value="([a-f0-9]+)"/))[1];}
 async post(p,f,from){const t=await this.csrf(from);return this.r('POST',p,{...f,_csrf:t});}}
const ok=(n,c,x='')=>console.log((c?'  ✓ ':'  ✗ ')+n+(c?'':'  → '+x));
(async()=>{
 // 1. ancien administrateur (rôle « admin » avant migration, mot de passe bcrypt)
 const a=new C(); let r=await a.post('/admin/connexion',{email:'super@test.local',password:'Staff-Test-2026-xyz!'},'/admin/connexion'); ok('ancien admin : mot de passe accepté → enrôlement MFA imposé',/mfa\/activer/.test(r.loc),r.loc);
 r=await a.r('GET','/admin/commandes'); ok('pas d\'accès au back-office avant le 2e facteur',r.s!==200,r.s);
 const pg=await a.r('GET','/admin/mfa/activer'); const sec=(pg.b.match(/font-family:monospace[^>]*>([A-Z2-7 ]{16,})</)||[])[1].replace(/ /g,'');
 r=await a.post('/admin/mfa/activer',{code:totp(sec)},'/admin/mfa/activer'); ok('enrôlement MFA validé → codes de secours',/mfa\/codes/.test(r.loc),r.loc);
 const codes=await a.r('GET','/admin/mfa/codes'); ok('8 codes de secours affichés',(codes.b.match(/>[a-f0-9]{5}-[a-f0-9]{5}</g)||[]).length===8);
 r=await a.r('GET','/admin'); ok('mot de passe à changer imposé après migration',/mot-de-passe/.test(r.loc),r.s+' '+r.loc);
 r=await a.post('/admin/mot-de-passe',{current_password:'Staff-Test-2026-xyz!',new_password:'Vigie-Bleue-Horizon-2026!'},'/admin/mot-de-passe'); ok('nouveau mot de passe accepté',/\/admin$/.test(r.loc),r.loc);
 r=await a.r('GET','/admin'); ok('tableau de bord accessible, rôle super administrateur',r.s===200 && /Équipe et rôles/.test(r.b),r.s);
 // 2. ancien client (e-mail jamais « confirmé » avant la mise à jour)
 const c=new C(); r=await c.post('/compte/connexion',{email:'alice@test.local',password:'Test-Pass-2026-xyz!'},'/compte/connexion'); ok('ancien client : connexion directe (compte considéré confirmé)',/\/compte$/.test(r.loc),r.loc);
 // 3. ancien responsable (manager → administrateur) : MFA aussi imposée
 const m=new C(); r=await m.post('/admin/connexion',{email:'admin@test.local',password:'Staff-Test-2026-xyz!'},'/admin/connexion'); ok('ancien « manager » devenu administrateur : MFA imposée',/mfa\/activer/.test(r.loc),r.loc);
})();
