import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = path.join(root, 'docs/agents/work-packages.json');
const normalize = value => value.replaceAll('\\', '/').toLowerCase();
const safePath = value => typeof value === 'string' && value.length > 0 &&
  !/^[a-z]:|^[/\\]|\*|\?|[\x00-\x1f]/i.test(value) &&
  !value.replaceAll('\\', '/').split('/').some(x => x === '..' || x === '.' || x === '');

export function validateManifest(manifest, checkFiles = false) {
  const errors = [];
  const packages = manifest.packages;
  if (!Array.isArray(packages) || packages.length === 0) return { errors: ['No packages'], layers: [], overlaps: [] };
  const ids = new Map();
  for (const task of packages) {
    if (!/^W\d{2}$/.test(task.id)) errors.push(`Invalid id ${task.id}`);
    if (ids.has(task.id)) errors.push(`Duplicate id ${task.id}`);
    ids.set(task.id, task);
    for (const field of ['dependsOn','writeFiles','readFiles','localAcceptance','verification','integrationChecks']) {
      if (!Array.isArray(task[field])) errors.push(`${task.id}: missing array ${field}`);
    }
    if (!task.writeFiles?.length || !task.localAcceptance?.length || !task.verification?.length) errors.push(`${task.id}: incomplete task contract`);
    if (!['L','M','H'].includes(task.implementerTier) || !['M','H'].includes(task.reviewerTier)) errors.push(`${task.id}: invalid model tiers`);
    if (task.implementerTier === 'H' && task.reviewerTier !== 'H') errors.push(`${task.id}: high-risk worker requires H reviewer`);
    if (manifest.status === 'planning-only' && task.status !== 'planned') errors.push(`${task.id}: false execution state in planning manifest`);
    if (task.phase === 1 && task.contractVersion !== manifest.common?.contractVersion) errors.push(`${task.id}: contract version mismatch`);
    if (task.phase === 2 && task.dispatchable !== false) errors.push(`${task.id}: phase 2 requires explicit contract refinement`);
    const files = [...(task.writeFiles ?? []), ...(task.readFiles ?? []), task.packet];
    for (const file of files) if (!safePath(file)) errors.push(`${task.id}: unsafe path ${file}`);
    const normalizedWrite = (task.writeFiles ?? []).map(normalize);
    if (new Set(normalizedWrite).size !== normalizedWrite.length) errors.push(`${task.id}: duplicate write path`);
    if (checkFiles) {
      for (const file of [...(task.readFiles ?? []), task.packet]) {
        if (safePath(file) && !existsSync(path.join(root, file))) errors.push(`${task.id}: missing input ${file}`);
      }
    }
  }
  for (const task of packages) {
    for (const dependency of task.dependsOn ?? []) {
      if (!ids.has(dependency)) errors.push(`${task.id}: missing dependency ${dependency}`);
      if (dependency === task.id) errors.push(`${task.id}: self dependency`);
      if (task.phase === 1 && ids.get(dependency)?.phase === 2) errors.push(`${task.id}: phase 1 depends on phase 2`);
    }
  }
  const done = new Set();
  const layers = [];
  while (done.size < ids.size) {
    const layer = packages.filter(task => !done.has(task.id) && (task.dependsOn ?? []).every(dep => done.has(dep))).map(task => task.id);
    if (!layer.length) { errors.push('Dependency graph contains a cycle or unresolved node'); break; }
    layers.push(layer);
    for (const id of layer) done.add(id);
  }
  function dependsTransitively(taskId, dependency, seen = new Set()) {
    if (seen.has(taskId)) return false;
    seen.add(taskId);
    return (ids.get(taskId)?.dependsOn ?? []).some(dep => dep === dependency || dependsTransitively(dep, dependency, seen));
  }
  const overlaps = [];
  for (let a = 0; a < packages.length; a++) {
    for (let b = a + 1; b < packages.length; b++) {
      const first = packages[a], second = packages[b];
      const secondWrites = new Set((second.writeFiles ?? []).map(normalize));
      const shared = (first.writeFiles ?? []).filter(file => secondWrites.has(normalize(file)));
      if (!shared.length) continue;
      const ordered = dependsTransitively(first.id, second.id) || dependsTransitively(second.id, first.id);
      overlaps.push({ first: first.id, second: second.id, files: shared, ordered });
      if (!ordered) errors.push(`Unordered write conflict ${first.id}/${second.id}: ${shared.join(', ')}`);
    }
  }
  const rules = manifest.schedulingRules;
  if (rules?.sharedCheckoutMaxWriters !== 1 || rules?.mergeConcurrency !== 1) errors.push('Single-writer/integrator limits missing');
  if (rules?.isolatedMaxWorkers + rules?.reviewSeats + rules?.integratorSeats > rules?.totalSeats) errors.push('Concurrency exceeds available seats');
  if (rules?.dependencies !== 'all integrated or accepted on integration branch') errors.push('Dependency readiness must require integrated evidence');
  if (checkFiles) {
    for (const file of manifest.common?.commonRead ?? []) {
      if (!safePath(file) || !existsSync(path.join(root, file))) errors.push(`Missing common input ${file}`);
    }
  }
  return { errors, layers, overlaps };
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8').replace(/^\uFEFF/, ''));
if (process.argv.includes('--self-test')) {
  const cases = [
    ['cycle', m => m.packages[0].dependsOn.push('W02')],
    ['missing dependency', m => m.packages[2].dependsOn.push('W99')],
    ['unordered write overlap', m => m.packages.find(p=>p.id==='W03').writeFiles.push('src/lib/story/sampleChapter.ts')],
    ['unsafe path', m => m.packages[0].writeFiles.push('../outside.txt')],
    ['weak reviewer', m => { m.packages[0].reviewerTier = 'L'; }],
    ['fake completed status', m => { m.packages[0].status = 'accepted'; }],
    ['version mismatch', m => { m.packages[2].contractVersion = 'other'; }],
    ['duplicate id', m => { m.packages[1].id = m.packages[0].id; }],
    ['premature phase 2', m => { m.packages.find(p=>p.phase===2).dispatchable = true; }]
  ];
  let failed = 0;
  for (const [label, mutate] of cases) {
    const specimen = structuredClone(manifest);
    mutate(specimen);
    const detected = validateManifest(specimen).errors.length > 0;
    console.log(`${detected ? 'PASS' : 'FAIL'} detects ${label}`);
    if (!detected) failed++;
  }
  process.exitCode = failed ? 1 : 0;
} else {
  const result = validateManifest(manifest, true);
  console.log(JSON.stringify({
    status: result.errors.length ? 'FAIL' : 'PASS',
    scope: 'Planning structure only; no application or runtime guarantee',
    packages: manifest.packages.length,
    phase1: manifest.packages.filter(p=>p.phase===1).length,
    phase2: manifest.packages.filter(p=>p.phase===2).length,
    topologicalLayers: result.layers,
    orderedSharedFilePairs: result.overlaps.filter(p=>p.ordered).length,
    errors: result.errors
  }, null, 2));
  process.exitCode = result.errors.length ? 1 : 0;
}
