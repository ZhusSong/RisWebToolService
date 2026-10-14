/* eslint-disable @typescript-eslint/no-require-imports */
const fs=require('node:fs'), ts=require('typescript'), assert=require('node:assert/strict');
function load(file, mocks) {
    const exports={};
    new Function('require','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{
        compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
    }).outputText)(name=>{if(name==='server-only')return {};if(name in mocks)return mocks[name];return require(name);},exports);
    return exports;
}
(async()=>{
    const guard=load('src/lib/request-guard.ts',{'./visitor-analytics':{getVisitorIp:()=>null}});
    let retry=0, quota=0, verified=0, loginAttempts=0;
    const guarded={...guard,requestRetryAfter:()=>retry};
    const translate=load('src/app/api/translate/route.ts',{
        '../../../lib/request-guard':guarded,
        '../../../lib/translation-limit':{MAX_TRANSLATION_CHARACTERS:2000,reserveTranslationUsage:()=>{quota++;throw Error('unexpected quota');}},
        '../../../lib/pronunciation':{},
    });
    const post=body=>translate.POST(new Request('http://localhost/api/translate',{method:'POST',body}));
    assert.equal((await post('x'.repeat(32001))).status,413);
    assert.equal((await post('{')).status,400);
    retry=12;
    const limited=await post('{}'); assert.equal(limited.status,429);assert.equal(limited.headers.get('retry-after'),'12');
    assert.equal(quota,0);retry=0;
    const login=load('src/app/(page)/page_admin_login/actions.ts',{
        '../../../lib/request-guard':guarded,
        '../../../lib/admin-login-limit':{allowAdminLoginAttempt:()=>{loginAttempts++;return true;}},
        '../../../lib/admin-auth':{verifyAdminCredentials:async()=>{verified++;return false;}},
        'next/navigation':{redirect:()=>{throw Error('unexpected redirect');}},
        'next/headers':{headers:async()=>new Headers()},
    });
    const form=new FormData();form.set('username','admin');form.set('password','test');
    retry=1;assert.match((await login.loginAdmin({error:''},form)).error,/频繁/);
    retry=0;form.set('extra','x'.repeat(8193));assert.match((await login.loginAdmin({error:''},form)).error,/过大/);
    form.delete('extra');form.append('username','other');assert.match((await login.loginAdmin({error:''},form)).error,/过大/);
    assert.equal(verified,0);assert.equal(loginAttempts,0);
    form.delete('username');form.set('username','admin');
    assert.match((await login.loginAdmin({error:''},form)).error,/错误/);
    assert.equal(verified,1);assert.equal(loginAttempts,1);
    console.log('PASS: translation 413/400/429 before quota, Retry-After, login throttling/size/duplicate fields before credential hashing; valid login path preserved.');
})().catch(error=>{console.error(error);process.exitCode=1;});
