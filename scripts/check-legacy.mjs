import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const root = process.cwd();
const files = execSync("find src -type f \\( -name '*.ts' -o -name '*.tsx' \\) ! -path 'src/integrations/supabase/types.ts' ! -path 'src/debug/*'", { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const checks = [
  { name: 'service role key', pattern: /SUPABASE_SERVICE_ROLE_KEY|service_role/i },
  { name: 'raw supabase rpc outside transport', pattern: /supabase\.rpc\(/, allow: /src\/integrations\/supabase\/rpcClient\.ts$/ },
  { name: 'direct provider demand write', pattern: /\.from\(['"]client_provider_demand['"]\)\.(insert|update|upsert|delete)/ },
  { name: 'private-pay therapy copy', pattern: /private[- ]pay therapy|private pay/i },
  { name: 'client-facing Blacklisted', pattern: /Blacklisted/ },
  { name: 'browser-computed therapist-led deadline', pattern: /(24\s*\*\s*60\s*\*\s*60|addHours\([^,]+,\s*24|therapist_led_deadline.*Date\.now)/ },
];
const violations = [];
for (const file of files) {
  const text = readFileSync(join(root, file), 'utf8');
  for (const check of checks) {
    if (check.allow?.test(file)) continue;
    if (check.pattern.test(text)) violations.push(`${file}: ${check.name}`);
  }
}
if (violations.length) {
  console.error('Legacy static check failed:\n' + violations.join('\n'));
  process.exit(1);
}
console.log('Legacy static check passed');
