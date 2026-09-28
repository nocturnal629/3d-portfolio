import { put } from '@vercel/blob';
import { NextResponse, type NextFetchEvent, type NextRequest } from 'next/server';

// Paths that get a fake dotenv file instead of a 404 — these are what
// credential-scraping bots are actually hoping to find.
const ENV_DECOY_PATH_LIST: string[] = [
  '/.env',
  '/.env.local',
  '/.env.production',
  '/.env.development',
  '/.env.backup',
  '/.env.bak',
  '/.env.old',
  '/.env.save',
];
const ENV_DECOY_PATHS = new Set(ENV_DECOY_PATH_LIST);

// Everything else here just gets logged and falls through to the normal
// Next.js 404, so an automated scanner can't tell it tripped a trap.
//
// This list doubles as the proxy `matcher` below (Next.js requires
// that array to be a static literal it can analyze at build time, so the
// two must stay in this file rather than a shared data module).
const RECON_PROBE_PATHS: string[] = [
  // Config / secrets files bots try after .env
  '/config.json.bak',
  '/config.php',
  '/config.yml',
  '/wp-config.php',
  '/wp-config.php.bak',
  '/docker-compose.yml',
  '/.dockerenv',

  // Version control internals (leaked .git directories)
  '/.git/:path*',
  '/.svn/:path*',

  // Cloud / SSH credential files
  '/.aws/:path*',
  '/.ssh/:path*',
  '/.npmrc',
  '/credentials.json',
  '/.htpasswd',
  '/.htaccess',

  // CMS / admin login panels
  '/wp-login.php',
  '/wp-admin/:path*',
  '/wp-content/:path*',
  '/wp-includes/:path*',
  '/xmlrpc.php',
  '/administrator/:path*',
  '/phpmyadmin/:path*',
  '/phpMyAdmin/:path*',
  '/pma/:path*',
  '/adminer.php',

  // Database backups / dumps
  '/backup.sql',
  '/backup.zip',
  '/database.sql',
  '/db.sql',
  '/dump.sql',
  '/site-backup.tar.gz',

  // Debug / infra endpoints
  '/actuator/:path*',
  '/server-status',
  '/debug',
  '/console',
  '/_profiler/:path*',
  '/telescope/:path*',
  '/_ignition/:path*',
  '/vendor/:path*',
  '/.vscode/sftp.json',
  '/.idea/workspace.xml',

  // Baited via robots.txt (Disallow entries that only a bot ignoring
  // robots.txt would go looking for) and the invisible link in the
  // footer (see Footer.tsx) that only a bot crawling every <a href>
  // would ever request.
  '/private-backup/:path*',
  '/internal-admin/:path*',
  '/staff-portal/:path*',
];

function buildDecoyEnv(): string {
  // Swap these two for a real AWS canary token (free, no signup, from
  // canarytokens.org) via Vercel env vars to get a genuine alert the
  // moment someone tries to use the "leaked" key, not just a log line.
  const awsAccessKeyId = process.env.HONEYPOT_AWS_ACCESS_KEY_ID || 'AKIAQWSXZXR7EXAMPLE1';
  const awsSecretKey = process.env.HONEYPOT_AWS_SECRET_ACCESS_KEY || 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';

  return `# Production environment — DO NOT COMMIT
NODE_ENV=production
APP_URL=https://www.aldrian-a.dev

DATABASE_URL=postgres://admin:S9x!vQ2mN7pL@db.internal-prod.local:5432/app_production
REDIS_URL=redis://default:kP2m!Rz8vQ@cache.internal-prod.local:6379

AWS_ACCESS_KEY_ID=${awsAccessKeyId}
AWS_SECRET_ACCESS_KEY=${awsSecretKey}
AWS_REGION=us-east-1

STRIPE_SECRET_KEY=sk_live_FAKE_DO_NOT_USE_00
JWT_SECRET=f4b9e2d1c6a8470eae3b6d9c1a2e5f7b
NEXTAUTH_SECRET=9f8a7d6c5b4a3e2d1c0b9a8f7e6d5c4b

SMTP_HOST=smtp.mailprovider.com
SMTP_USER=noreply@aldrian-a.dev
SMTP_PASSWORD=Winter2024!Mail
ADMIN_PASSWORD=Tr0ub4dor&3Prod
`;
}

function logHoneypotHit(request: NextRequest, event: NextFetchEvent, hitType: 'env-file' | 'recon-probe') {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown';

  const details = {
    event: 'honeypot_hit',
    hitType,
    path: request.nextUrl.pathname,
    method: request.method,
    ip,
    userAgent: request.headers.get('user-agent') || 'unknown',
    referer: request.headers.get('referer') || undefined,
    timestamp: new Date().toISOString(),
  };

  // console.warn (not .log) so hits stand out in the Vercel Logs level filter.
  console.warn('[honeypot]', JSON.stringify(details));

  // Compiled record for offline IP/UA lookups (abuse databases, geo-IP, etc.)
  // and the separate world-map dashboard project — not read by this app.
  const record = put(`honeypot/${Date.now()}-${hitType}.json`, JSON.stringify(details, null, 2), {
    access: 'private',
    addRandomSuffix: true,
    contentType: 'application/json',
    // Force the static read-write token: when a Vercel OIDC token is also
    // present in the environment, the SDK prefers it, which fails outside
    // an actual Vercel deployment (e.g. local dev with pulled prod vars).
    token: process.env.BLOB_READ_WRITE_TOKEN,
  }).catch((error) => {
    console.error('[honeypot] blob write failed:', error);
  });

  // Don't block the response on the blob write.
  event.waitUntil(record);
}

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  if (ENV_DECOY_PATHS.has(pathname)) {
    logHoneypotHit(request, event, 'env-file');
    return new NextResponse(buildDecoyEnv(), {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  logHoneypotHit(request, event, 'recon-probe');
  return NextResponse.next();
}

// Next.js statically parses this exported literal at build time to decide
// which requests invoke the proxy at all — it can't be a spread or
// reference to another variable. Keep it in sync with ENV_DECOY_PATH_LIST
// and RECON_PROBE_PATHS above (the dev-only check below will warn on drift).
export const config = {
  matcher: [
    '/.env',
    '/.env.local',
    '/.env.production',
    '/.env.development',
    '/.env.backup',
    '/.env.bak',
    '/.env.old',
    '/.env.save',
    '/config.json.bak',
    '/config.php',
    '/config.yml',
    '/wp-config.php',
    '/wp-config.php.bak',
    '/docker-compose.yml',
    '/.dockerenv',
    '/.git/:path*',
    '/.svn/:path*',
    '/.aws/:path*',
    '/.ssh/:path*',
    '/.npmrc',
    '/credentials.json',
    '/.htpasswd',
    '/.htaccess',
    '/wp-login.php',
    '/wp-admin/:path*',
    '/wp-content/:path*',
    '/wp-includes/:path*',
    '/xmlrpc.php',
    '/administrator/:path*',
    '/phpmyadmin/:path*',
    '/phpMyAdmin/:path*',
    '/pma/:path*',
    '/adminer.php',
    '/backup.sql',
    '/backup.zip',
    '/database.sql',
    '/db.sql',
    '/dump.sql',
    '/site-backup.tar.gz',
    '/actuator/:path*',
    '/server-status',
    '/debug',
    '/console',
    '/_profiler/:path*',
    '/telescope/:path*',
    '/_ignition/:path*',
    '/vendor/:path*',
    '/.vscode/sftp.json',
    '/.idea/workspace.xml',
    '/private-backup/:path*',
    '/internal-admin/:path*',
    '/staff-portal/:path*',
  ],
};

if (process.env.NODE_ENV !== 'production') {
  const expected = JSON.stringify([...ENV_DECOY_PATH_LIST, ...RECON_PROBE_PATHS]);
  if (JSON.stringify(config.matcher) !== expected) {
    console.warn(
      '[honeypot] config.matcher has drifted from ENV_DECOY_PATH_LIST/RECON_PROBE_PATHS — update src/proxy.ts'
    );
  }
}
