import {execFileSync} from 'node:child_process';import {readFile} from 'node:fs/promises';
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);let bad=false;
const patterns=[/\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/,/sb_secret_[A-Za-z0-9_-]{12,}/,/(?:postgres(?:ql)?|rediss?):\/\/[^\s:@]+:[^\s@]{8,}@(?!(?:localhost|127\.0\.0\.1|HOST|example\.com))/];
for(const file of files){if(file.endsWith('package-lock.json')||file=== 'scripts/secrets-check.js')continue;const text=await readFile(file,'utf8').catch(()=>'');if(patterns.some(p=>p.test(text))||(/^\.env/.test(file)&&file!=='.env.example')){console.error('Potential secret in '+file);bad=true;}}
if(bad)process.exit(1);console.log('No production credentials detected in tracked/candidate files.');
