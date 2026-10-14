/* eslint-disable @typescript-eslint/no-require-imports */
// Explicit opt-in, fixed target, bounded production smoke load test.
const fs = require('node:fs');
const path = require('node:path');
if (!process.argv.includes('--run')) throw new Error('Use --run to send bounded requests to ristoolweb.com');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const extended = process.argv.includes('--extended');
const seconds = extended ? 20 : 10;
const rates = extended ? [20, 40, 80, 120, 160, 200] : [1,5,10,20];
const report = { started: new Date().toISOString(), target: 'https://ristoolweb.com', secondsPerStage: seconds, concurrencyCap: extended ? 32 : 20, stages: [], stopped: '' };
const output = path.join(__dirname, extended ? '../Summarize/25-load-test-results.json' : '../Summarize/24-load-test-results.json');
const save = () => fs.writeFileSync(output, JSON.stringify(report,null,2)+'\n','utf8');
let active = 0, consecutiveFailures = 0;
async function stage(rate) {
    const samples = [], pending = [];
    let skipped = 0;
    let peakActive = 0;
    let lateStarts = 0;
    let slow = 0;
    const start = performance.now();
    for (let index = 0; index < rate * seconds; index++) {
        await sleep(Math.max(0, start + index * 1000 / rate - performance.now()));
        if (report.stopped) break;
        if (performance.now() - (start + index * 1000 / rate) > 100) lateStarts++;
        if (active >= report.concurrencyCap) { skipped++; report.stopped ||= 'Concurrency cap reached'; break; }
        active++;
        peakActive = Math.max(peakActive, active);
        pending.push((async () => {
            const begin = performance.now();
            const route = index % 2 ? '/page_modelviewer' : '/';
            let status = 0, bytes = 0, error = '';
            try {
                const response = await fetch(report.target + route, {
                    redirect: 'error', signal: AbortSignal.timeout(3000),
                    headers: { 'User-Agent': 'RistoolOwnerBoundedLoadTest/1.0' }
                });
                status = response.status;
                bytes = (await response.arrayBuffer()).byteLength;
                if (status !== 200) error = 'HTTP ' + status;
            } catch (e) { error = e.message; }
            const ms = performance.now() - begin;
            samples.push({ route, status, ms: Math.round(ms), bytes, error });
            consecutiveFailures = error ? consecutiveFailures + 1 : 0;
            slow = ms > 500 ? slow + 1 : 0;
            if (extended && slow >= 10) report.stopped ||= 'Ten consecutive responses above 500ms';
            if (status === 429 || status >= 500 || consecutiveFailures >= 3) report.stopped ||= 'Error/timeout safety threshold';
            active--;
        })());
    }
    await Promise.all(pending);
    const elapsed = Math.max(report.stopped ? 0 : seconds, (performance.now() - start) / 1000);
    const sorted = samples.map(s => s.ms).sort((a,b) => a-b);
    const p = q => sorted[Math.max(0, Math.ceil(sorted.length*q)-1)] ?? 0;
    const summary = { rate, requests: samples.length, skipped, peakActive, lateStarts, errors: samples.filter(s=>s.error).length, elapsedSeconds: +elapsed.toFixed(2), achievedRps: +(samples.length/elapsed).toFixed(2), p50: p(.5), p95: p(.95), max: p(1), bytes: samples.reduce((sum,s)=>sum+s.bytes,0) };
    if (summary.p95 > (extended ? 500 : 1500) || skipped) report.stopped ||= 'Latency/concurrency safety threshold';
    if (lateStarts > samples.length * .05) report.stopped ||= 'Load generator scheduling delay';
    report.stages.push({ ...summary, samples });
    console.log(JSON.stringify(summary));
    save();
}
(async () => {
    for (const rate of rates) {
        await stage(rate);
        if (report.stopped) break;
        await sleep(extended ? 5000 : 3000);
    }
    report.finished = new Date().toISOString();
    save();
    console.log('Finished:', report.stopped || 'All bounded stages passed');
})().catch(error => { console.error(error); process.exitCode=1; });
