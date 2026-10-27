// NEXUS device API — real Linux integration for the shell.
//
// Everything here runs ONLY on the booted ISO (or any Ubuntu host running
// /opt/nexus/server.mjs). All endpoints are loopback-only; the browser build
// simply gets a failed probe and keeps using the simulated subsystems.
//
//   GET  /nexus/system                    capability probe
//   /nexus/fs      list|read|write|mkdir|rm|rename|stat   (real /home/nexus)
//   /nexus/sys     stat|procs|services  + kill|renice|service
//   /nexus/hw      status  + brightness|volume|wifi|bluetooth|rfkill
//   /nexus/apps    list (.desktop scan) + launch
//   /nexus/pkg     list|search + install|remove|update (apt)
//   /nexus/auth    users + verify (PAM)
import { spawn, execFile } from 'node:child_process';
import { promises as fs, existsSync, readFileSync } from 'node:fs';
import { join, resolve, dirname, basename } from 'node:path';
import { userInfo, hostname, release, totalmem, freemem, loadavg, uptime } from 'node:os';

const HOME = userInfo().homedir || '/home/nexus';
const MAX_READ = 2 * 1024 * 1024;

export function json(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}

export function isLoopback(req) {
  return /^(::1|::ffff:127\.|127\.)/.test(req.socket.remoteAddress || '');
}

export function readBody(req, limit = 4 * 1024 * 1024) {
  return new Promise((ok, fail) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > limit) fail(new Error('body too large'));
    });
    req.on('end', () => ok(data));
    req.on('error', fail);
  });
}

function run(cmd, args, { timeout = 20_000, input } = {}) {
  return new Promise((ok) => {
    let child;
    try {
      child = spawn(cmd, args, { env: { ...process.env, LC_ALL: 'C' } });
    } catch (err) {
      return ok({ code: 127, stdout: '', stderr: String(err) });
    }
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (c) => {
      if (stdout.length < 1024 * 1024) stdout += c;
    });
    child.stderr?.on('data', (c) => {
      if (stderr.length < 256 * 1024) stderr += c;
    });
    const timer = setTimeout(() => child.kill('SIGKILL'), timeout);
    child.on('error', (err) => {
      clearTimeout(timer);
      ok({ code: 127, stdout: '', stderr: String(err) });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      ok({ code: code ?? -1, stdout, stderr });
    });
    if (input !== undefined) {
      child.stdin?.write(input);
      child.stdin?.end();
    }
  });
}

const has = (bin) =>
  ['/usr/bin', '/usr/sbin', '/bin', '/sbin', '/usr/local/bin'].some((d) => existsSync(join(d, bin)));

// ---------------------------------------------------------------- filesystem
// Every path is confined to the session user's home unless NEXUS_FS_ROOT
// widens it (default "/" is refused; the shell has the Terminal for that).
const FS_ROOT = resolve(process.env.NEXUS_FS_ROOT || HOME);

function safePath(p) {
  const target = resolve(FS_ROOT, String(p || '.').replace(/^~\/?/, ''));
  if (target !== FS_ROOT && !target.startsWith(FS_ROOT + '/')) return null;
  return target;
}

async function fsHandler(req, res, url) {
  const op = url.searchParams.get('op') || 'list';
  const body = req.method === 'POST' ? JSON.parse((await readBody(req)) || '{}') : {};
  const rel = body.path ?? url.searchParams.get('path') ?? '.';
  const target = safePath(rel);
  if (!target) return json(res, 400, { error: 'path outside root' });
  const toRel = (abs) => abs.slice(FS_ROOT.length).replace(/^\//, '') || '';

  try {
    switch (op) {
      case 'list': {
        const entries = await fs.readdir(target, { withFileTypes: true });
        const items = await Promise.all(
          entries.map(async (e) => {
            const abs = join(target, e.name);
            let size = 0;
            let modified = 0;
            let mode = 0;
            try {
              const st = await fs.stat(abs);
              size = st.size;
              modified = st.mtimeMs;
              mode = st.mode & 0o777;
            } catch {
              /* dangling symlink */
            }
            return {
              name: e.name,
              path: toRel(abs),
              type: e.isDirectory() ? 'folder' : 'file',
              size,
              modified,
              mode,
              hidden: e.name.startsWith('.'),
            };
          }),
        );
        items.sort((a, b) =>
          a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'folder' ? -1 : 1,
        );
        return json(res, 200, { root: FS_ROOT, path: toRel(target), items });
      }
      case 'stat': {
        const st = await fs.stat(target);
        return json(res, 200, {
          path: toRel(target),
          size: st.size,
          modified: st.mtimeMs,
          mode: st.mode & 0o777,
          type: st.isDirectory() ? 'folder' : 'file',
        });
      }
      case 'read': {
        const st = await fs.stat(target);
        if (st.size > MAX_READ) return json(res, 413, { error: 'file too large' });
        return json(res, 200, { path: toRel(target), content: await fs.readFile(target, 'utf8') });
      }
      case 'write': {
        await fs.mkdir(dirname(target), { recursive: true });
        await fs.writeFile(target, String(body.content ?? ''), 'utf8');
        return json(res, 200, { ok: true, path: toRel(target) });
      }
      case 'mkdir': {
        await fs.mkdir(target, { recursive: true });
        return json(res, 200, { ok: true, path: toRel(target) });
      }
      case 'rm': {
        // Soft-delete into the freedesktop trash so the Recycle Bin is real.
        if (body.permanent) {
          await fs.rm(target, { recursive: true, force: true });
          return json(res, 200, { ok: true, trashed: false });
        }
        const trashDir = join(HOME, '.local/share/Trash/files');
        const infoDir = join(HOME, '.local/share/Trash/info');
        await fs.mkdir(trashDir, { recursive: true });
        await fs.mkdir(infoDir, { recursive: true });
        let name = basename(target);
        while (existsSync(join(trashDir, name))) name = `${Date.now()}-${name}`;
        await fs.rename(target, join(trashDir, name));
        await fs.writeFile(
          join(infoDir, `${name}.trashinfo`),
          `[Trash Info]\nPath=${target}\nDeletionDate=${new Date().toISOString()}\n`,
        );
        return json(res, 200, { ok: true, trashed: true, name });
      }
      case 'rename': {
        const dest = safePath(body.to);
        if (!dest) return json(res, 400, { error: 'destination outside root' });
        await fs.rename(target, dest);
        return json(res, 200, { ok: true, path: toRel(dest) });
      }
      default:
        return json(res, 400, { error: `unknown fs op ${op}` });
    }
  } catch (err) {
    return json(res, 200, { error: String(err?.message || err) });
  }
}

// -------------------------------------------------------------- system stats
let lastCpu = null;

function cpuSample() {
  try {
    const line = readFileSync('/proc/stat', 'utf8').split('\n')[0];
    const parts = line.trim().split(/\s+/).slice(1).map(Number);
    const idle = parts[3] + (parts[4] || 0);
    const total = parts.reduce((a, b) => a + b, 0);
    return { idle, total };
  } catch {
    return null;
  }
}

function cpuUsage() {
  const now = cpuSample();
  if (!now) return null;
  let pct = 0;
  if (lastCpu) {
    const dt = now.total - lastCpu.total;
    const di = now.idle - lastCpu.idle;
    if (dt > 0) pct = Math.max(0, Math.min(100, ((dt - di) / dt) * 100));
  }
  lastCpu = now;
  return Math.round(pct * 10) / 10;
}

function meminfo() {
  try {
    const raw = readFileSync('/proc/meminfo', 'utf8');
    const num = (k) => Number(raw.match(new RegExp(`^${k}:\\s+(\\d+) kB`, 'm'))?.[1] || 0) * 1024;
    const total = num('MemTotal');
    const available = num('MemAvailable');
    return {
      total,
      available,
      used: total - available,
      swapTotal: num('SwapTotal'),
      swapUsed: num('SwapTotal') - num('SwapFree'),
    };
  } catch {
    const total = totalmem();
    return { total, available: freemem(), used: total - freemem(), swapTotal: 0, swapUsed: 0 };
  }
}

async function disks() {
  const { stdout } = await run('df', ['-B1', '--output=source,target,size,used,avail,pcent', '-x', 'tmpfs', '-x', 'devtmpfs']);
  return stdout
    .trim()
    .split('\n')
    .slice(1)
    .map((l) => l.trim().split(/\s+/))
    .filter((c) => c.length >= 6)
    .map(([source, target, size, used, avail, pcent]) => ({
      source,
      target,
      size: Number(size),
      used: Number(used),
      available: Number(avail),
      percent: Number(String(pcent).replace('%', '')),
    }));
}

async function procs() {
  const { stdout } = await run('ps', ['-eo', 'pid,ppid,user,pri,ni,pcpu,pmem,rss,stat,comm,args', '--no-headers']);
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const m = line.trim().match(/^(\d+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(.*)$/);
      if (!m) return null;
      return {
        pid: Number(m[1]),
        ppid: Number(m[2]),
        user: m[3],
        priority: Number(m[4]) || 0,
        nice: Number(m[5]) || 0,
        cpu: Number(m[6]) || 0,
        memPercent: Number(m[7]) || 0,
        rss: Number(m[8]) * 1024,
        state: m[9],
        name: m[10],
        command: m[11],
      };
    })
    .filter(Boolean);
}

async function services() {
  const { stdout } = await run('systemctl', ['list-units', '--type=service', '--all', '--no-pager', '--plain', '--no-legend']);
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((l) => l.trim().split(/\s+/))
    .filter((c) => c.length >= 4)
    .map((c) => ({ unit: c[0], load: c[1], active: c[2], sub: c[3], description: c.slice(4).join(' ') }));
}

async function sysHandler(req, res, url) {
  const op = url.searchParams.get('op') || 'stat';
  const body = req.method === 'POST' ? JSON.parse((await readBody(req)) || '{}') : {};

  if (req.method === 'GET') {
    if (op === 'procs') return json(res, 200, { procs: await procs() });
    if (op === 'services') return json(res, 200, { services: await services() });
    let model = 'CPU';
    try {
      model = readFileSync('/proc/cpuinfo', 'utf8').match(/^model name\s*:\s*(.+)$/m)?.[1] || model;
    } catch {
      /* non-x86 */
    }
    const cores = (() => {
      try {
        return (readFileSync('/proc/cpuinfo', 'utf8').match(/^processor\s*:/gm) || []).length || 1;
      } catch {
        return 1;
      }
    })();
    return json(res, 200, {
      host: hostname(),
      kernel: release(),
      uptime: uptime(),
      load: loadavg(),
      cpu: { model, cores, usage: cpuUsage() },
      memory: meminfo(),
      disks: await disks(),
    });
  }

  if (op === 'kill') {
    const r = await run('kill', [`-${body.signal || 'TERM'}`, String(Number(body.pid))]);
    return json(res, 200, { ok: r.code === 0, error: r.stderr.trim() || undefined });
  }
  if (op === 'renice') {
    const r = await run('renice', ['-n', String(Number(body.nice)), '-p', String(Number(body.pid))]);
    return json(res, 200, { ok: r.code === 0, error: r.stderr.trim() || undefined });
  }
  if (op === 'service') {
    const action = ['start', 'stop', 'restart'].includes(body.action) ? body.action : null;
    if (!action || !/^[\w@.\-]+$/.test(String(body.unit))) return json(res, 400, { error: 'bad request' });
    const r = await run('systemctl', [action, String(body.unit)]);
    return json(res, 200, { ok: r.code === 0, error: r.stderr.trim() || undefined });
  }
  return json(res, 400, { error: `unknown sys op ${op}` });
}

// ------------------------------------------------------------------ hardware
async function battery() {
  if (!has('upower')) return null;
  const { stdout: list } = await run('upower', ['-e']);
  const path = list.split('\n').find((l) => l.includes('battery'));
  if (!path) return null;
  const { stdout } = await run('upower', ['-i', path.trim()]);
  const g = (k) => stdout.match(new RegExp(`${k}:\\s+(.+)`))?.[1]?.trim();
  return {
    percent: Number(String(g('percentage') || '0').replace('%', '')),
    state: g('state') || 'unknown',
    timeToEmpty: g('time to empty') || null,
    timeToFull: g('time to full') || null,
    vendor: g('vendor') || null,
  };
}

async function brightness() {
  if (!has('brightnessctl')) return null;
  const { stdout } = await run('brightnessctl', ['-m']);
  const parts = stdout.trim().split(',');
  if (parts.length < 5) return null;
  return { percent: Number(String(parts[3]).replace('%', '')), device: parts[0] };
}

async function volume() {
  if (!has('wpctl')) return null;
  const { stdout } = await run('wpctl', ['get-volume', '@DEFAULT_AUDIO_SINK@']);
  const m = stdout.match(/Volume:\s*([\d.]+)(\s*\[MUTED\])?/);
  if (!m) return null;
  return { percent: Math.round(Number(m[1]) * 100), muted: Boolean(m[2]) };
}

async function wifiList() {
  if (!has('nmcli')) return [];
  const { stdout } = await run('nmcli', ['-t', '-f', 'ACTIVE,SSID,SIGNAL,SECURITY', 'device', 'wifi', 'list']);
  const seen = new Set();
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split(':'))
    .filter((c) => c[1] && !seen.has(c[1]) && seen.add(c[1]))
    .map((c) => ({
      active: c[0] === 'yes',
      ssid: c[1],
      signal: Number(c[2]) || 0,
      security: c[3] || 'Open',
    }))
    .sort((a, b) => b.signal - a.signal);
}

async function connections() {
  if (!has('nmcli')) return [];
  const { stdout } = await run('nmcli', ['-t', '-f', 'DEVICE,TYPE,STATE,CONNECTION', 'device', 'status']);
  return stdout
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split(':'))
    .map((c) => ({ device: c[0], type: c[1], state: c[2], connection: c[3] || null }));
}

async function bluetooth() {
  if (!has('bluetoothctl')) return null;
  const { stdout: show } = await run('bluetoothctl', ['show'], { timeout: 6000 });
  const { stdout: devs } = await run('bluetoothctl', ['devices'], { timeout: 6000 });
  return {
    powered: /Powered:\s*yes/.test(show),
    devices: devs
      .split('\n')
      .filter(Boolean)
      .map((l) => l.match(/^Device (\S+) (.*)$/))
      .filter(Boolean)
      .map((m) => ({ mac: m[1], name: m[2] })),
  };
}

async function hwHandler(req, res, url) {
  const op = url.searchParams.get('op') || 'status';
  const body = req.method === 'POST' ? JSON.parse((await readBody(req)) || '{}') : {};

  if (req.method === 'GET') {
    if (op === 'wifi') return json(res, 200, { networks: await wifiList() });
    const [bat, bright, vol, nets, bt] = await Promise.all([
      battery(),
      brightness(),
      volume(),
      connections(),
      bluetooth(),
    ]);
    return json(res, 200, { battery: bat, brightness: bright, volume: vol, network: nets, bluetooth: bt });
  }

  switch (op) {
    case 'brightness': {
      if (!has('brightnessctl')) return json(res, 200, { error: 'brightnessctl missing' });
      const pct = Math.max(1, Math.min(100, Number(body.percent) || 50));
      await run('brightnessctl', ['set', `${pct}%`]);
      return json(res, 200, { ok: true, brightness: await brightness() });
    }
    case 'volume': {
      if (!has('wpctl')) return json(res, 200, { error: 'pipewire tools missing' });
      if (typeof body.muted === 'boolean') {
        await run('wpctl', ['set-mute', '@DEFAULT_AUDIO_SINK@', body.muted ? '1' : '0']);
      }
      if (typeof body.percent === 'number') {
        const pct = Math.max(0, Math.min(150, body.percent));
        await run('wpctl', ['set-volume', '@DEFAULT_AUDIO_SINK@', `${(pct / 100).toFixed(2)}`]);
      }
      return json(res, 200, { ok: true, volume: await volume() });
    }
    case 'wifi-connect': {
      if (!has('nmcli')) return json(res, 200, { error: 'NetworkManager missing' });
      const ssid = String(body.ssid || '');
      if (!ssid) return json(res, 400, { error: 'ssid required' });
      const args = ['device', 'wifi', 'connect', ssid];
      if (body.password) args.push('password', String(body.password));
      const r = await run('nmcli', args, { timeout: 45_000 });
      return json(res, 200, { ok: r.code === 0, error: r.code === 0 ? undefined : r.stderr.trim() || r.stdout.trim() });
    }
    case 'wifi-disconnect': {
      const r = await run('nmcli', ['device', 'disconnect', String(body.device || 'wlan0')]);
      return json(res, 200, { ok: r.code === 0, error: r.stderr.trim() || undefined });
    }
    case 'rfkill': {
      const r = await run('nmcli', ['radio', body.kind === 'wwan' ? 'wwan' : 'wifi', body.enabled ? 'on' : 'off']);
      return json(res, 200, { ok: r.code === 0 });
    }
    case 'bluetooth': {
      if (!has('bluetoothctl')) return json(res, 200, { error: 'bluez missing' });
      const cmds = [];
      if (typeof body.powered === 'boolean') cmds.push(`power ${body.powered ? 'on' : 'off'}`);
      if (body.scan) cmds.push('scan on');
      if (body.connect) cmds.push(`connect ${String(body.connect)}`);
      if (body.disconnect) cmds.push(`disconnect ${String(body.disconnect)}`);
      const r = await run('bluetoothctl', [], { input: cmds.join('\n') + '\nquit\n', timeout: 15_000 });
      return json(res, 200, { ok: r.code === 0, bluetooth: await bluetooth() });
    }
    default:
      return json(res, 400, { error: `unknown hw op ${op}` });
  }
}

// ----------------------------------------------------------- desktop entries
const APP_DIRS = [
  '/usr/share/applications',
  '/usr/local/share/applications',
  join(HOME, '.local/share/applications'),
  '/var/lib/flatpak/exports/share/applications',
];

function parseDesktop(text) {
  const section = text.split(/^\[/m).find((s) => s.startsWith('Desktop Entry]'));
  if (!section) return null;
  const get = (k) => section.match(new RegExp(`^${k}=(.*)$`, 'm'))?.[1]?.trim();
  const name = get('Name');
  const exec = get('Exec');
  if (!name || !exec) return null;
  if (get('NoDisplay') === 'true' || get('Hidden') === 'true') return null;
  if ((get('Type') || 'Application') !== 'Application') return null;
  return {
    name,
    exec,
    comment: get('Comment') || '',
    icon: get('Icon') || '',
    categories: (get('Categories') || '').split(';').filter(Boolean),
    terminal: get('Terminal') === 'true',
  };
}

async function desktopApps() {
  const out = [];
  const seen = new Set();
  for (const dir of APP_DIRS) {
    let files = [];
    try {
      files = await fs.readdir(dir);
    } catch {
      continue;
    }
    for (const f of files) {
      if (!f.endsWith('.desktop') || seen.has(f)) continue;
      try {
        const entry = parseDesktop(await fs.readFile(join(dir, f), 'utf8'));
        if (entry) {
          seen.add(f);
          out.push({ id: f, ...entry });
        }
      } catch {
        /* unreadable entry */
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

async function appsHandler(req, res, url) {
  if (req.method === 'GET') return json(res, 200, { apps: await desktopApps() });
  const body = JSON.parse((await readBody(req)) || '{}');
  const op = url.searchParams.get('op') || 'launch';
  if (op !== 'launch') return json(res, 400, { error: 'unknown apps op' });
  const all = await desktopApps();
  const entry = all.find((a) => a.id === body.id);
  if (!entry) return json(res, 404, { error: 'app not found' });
  if (has('gtk-launch')) {
    const child = spawn('gtk-launch', [entry.id.replace(/\.desktop$/, '')], {
      detached: true,
      stdio: 'ignore',
    });
    child.unref();
  } else {
    const cmd = entry.exec.replace(/%[fFuUdDnNickvm]/g, '').trim();
    const child = spawn('/bin/sh', ['-c', cmd], { detached: true, stdio: 'ignore' });
    child.unref();
  }
  return json(res, 202, { started: true, name: entry.name });
}

// ------------------------------------------------------------------ packages
// apt + dpkg (Ubuntu 24.04). Privileged actions go through pkexec, falling
// back to sudo for hosts where polkit isn't installed.
function pkexecCmd(args) {
  return has('pkexec') ? ['pkexec', 'env', 'DEBIAN_FRONTEND=noninteractive', ...args] : ['sudo', '-n', ...args];
}

async function pkgHandler(req, res, url) {
  if (!has('apt-get') || !has('dpkg-query')) return json(res, 200, { error: 'apt unavailable', packages: [] });
  const op = url.searchParams.get('op') || 'list';

  if (req.method === 'GET') {
    if (op === 'search') {
      const q = url.searchParams.get('q') || '';
      if (!/^[\w.+\- ]{1,64}$/.test(q)) return json(res, 400, { error: 'bad query' });
      const r = await run('apt-cache', ['search', q], { timeout: 60_000 });
      // lines look like: "name – description" (apt uses an en dash; older versions a hyphen)
      const packages = r.stdout
        .split('\n')
        .map((l) => l.match(/^([\w.+-]+)\s+[–-]\s*(.*)$/))
        .filter(Boolean)
        .map((m) => ({ name: m[1], summary: m[2], installed: false }));
      return json(res, 200, { packages });
    }
    if (op === 'updates') {
      await run('apt-get', ['update', '-q'], { timeout: 120_000 });
      const r = await run('apt-get', ['-s', 'upgrade'], { timeout: 120_000 });
      // simulated-upgrade lines: "Inst libfoo [1.0-1ubuntu1] (1.0-1ubuntu2 ubuntu:...)"
      const packages = r.stdout
        .split('\n')
        .map((l) => l.match(/^Inst ([\w.+-]+) \[.*\] \((\S+)/))
        .filter(Boolean)
        .map((m) => ({ name: m[1], version: m[2], repo: 'ubuntu' }));
      return json(res, 200, { packages, hasUpdates: packages.length > 0 });
    }
    const r = await run(
      'dpkg-query',
      ['-W', "-f=${Status}\\t${Package}\\t${Version}\\t${Installed-Size}\\n"],
      { timeout: 60_000 },
    );
    const packages = r.stdout
      .split('\n')
      .filter(Boolean)
      .map((l) => l.split('\t'))
      .filter((c) => c[0] === 'install ok installed')
      .map(([, name, version, sizeKb]) => ({
        name,
        version,
        size: (Number(sizeKb) || 0) * 1024,
        installed: true,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return json(res, 200, { packages });
  }

  const body = JSON.parse((await readBody(req)) || '{}');
  const name = String(body.name || '');
  if (op !== 'update' && !/^[\w.+-]{1,80}$/.test(name)) return json(res, 400, { error: 'bad package name' });
  const action = op === 'install' ? 'install' : op === 'remove' ? 'remove' : op === 'update' ? 'upgrade' : null;
  if (!action) return json(res, 400, { error: 'unknown pkg op' });
  const aptArgs = ['-y', '-o', 'Dpkg::Options::=--force-confdef', '-o', 'Dpkg::Options::=--force-confold', action];
  if (action !== 'upgrade' || name) aptArgs.push(name);
  const r = await run(pkexecCmd(['apt-get', ...aptArgs]), { timeout: 15 * 60_000 });
  return json(res, 200, {
    ok: r.code === 0,
    log: (r.stdout + r.stderr).slice(-8000),
  });
}

// ---------------------------------------------------------------------- auth
// Real accounts from /etc/passwd, real password checks through PAM.
async function realUsers() {
  const raw = await fs.readFile('/etc/passwd', 'utf8');
  return raw
    .split('\n')
    .filter(Boolean)
    .map((l) => l.split(':'))
    .filter((c) => Number(c[2]) >= 1000 && Number(c[2]) < 65534 && !c[6]?.includes('nologin'))
    .map((c) => ({ username: c[0], uid: Number(c[2]), fullName: (c[4] || '').split(',')[0] || c[0], home: c[5] }));
}

function pamVerify(username, password) {
  return new Promise((ok) => {
    if (!has('pamtester')) return ok({ supported: false });
    const child = execFile('pamtester', ['login', username, 'authenticate'], (err) =>
      ok({ supported: true, valid: !err }),
    );
    child.stdin?.write(password + '\n');
    child.stdin?.end();
  });
}

async function authHandler(req, res, url) {
  if (req.method === 'GET') return json(res, 200, { users: await realUsers(), pam: has('pamtester') });
  const body = JSON.parse((await readBody(req)) || '{}');
  if ((url.searchParams.get('op') || 'verify') !== 'verify') return json(res, 400, { error: 'unknown auth op' });
  const username = String(body.username || '');
  if (!/^[\w.\-]{1,32}$/.test(username)) return json(res, 400, { error: 'bad username' });
  const users = await realUsers();
  if (!users.some((u) => u.username === username)) return json(res, 404, { valid: false, error: 'no such user' });
  const result = await pamVerify(username, String(body.password || ''));
  return json(res, 200, result.supported ? { valid: result.valid, pam: true } : { valid: false, pam: false });
}

// --------------------------------------------------------------------- entry
export async function handleNexusApi(req, res, url) {
  const p = url.pathname;
  if (!p.startsWith('/nexus/')) return false;
  if (!isLoopback(req)) {
    json(res, 403, { error: 'loopback only' });
    return true;
  }
  if ((process.env.NEXUS_API || 'on') === 'off') {
    json(res, 200, { available: false, reason: 'device api disabled' });
    return true;
  }

  try {
    switch (p) {
      case '/nexus/system':
        json(res, 200, {
          available: true,
          host: hostname(),
          kernel: release(),
          user: userInfo().username,
          home: HOME,
          fsRoot: FS_ROOT,
          os: (() => {
            try {
              return readFileSync('/etc/os-release', 'utf8').match(/^PRETTY_NAME="?(.*?)"?$/m)?.[1] || 'Linux';
            } catch {
              return 'Linux';
            }
          })(),
          capabilities: {
            fs: true,
            processes: has('ps'),
            services: has('systemctl'),
            battery: has('upower'),
            brightness: has('brightnessctl'),
            volume: has('wpctl'),
            wifi: has('nmcli'),
            bluetooth: has('bluetoothctl'),
            apps: true,
            packages: has('apt-get') && has('dpkg-query'),
            pam: has('pamtester'),
          },
        });
        return true;
      case '/nexus/fs':
        await fsHandler(req, res, url);
        return true;
      case '/nexus/sys':
        await sysHandler(req, res, url);
        return true;
      case '/nexus/hw':
        await hwHandler(req, res, url);
        return true;
      case '/nexus/apps':
        await appsHandler(req, res, url);
        return true;
      case '/nexus/pkg':
        await pkgHandler(req, res, url);
        return true;
      case '/nexus/auth':
        await authHandler(req, res, url);
        return true;
      default:
        return false;
    }
  } catch (err) {
    json(res, 500, { error: String(err?.message || err) });
    return true;
  }
}
