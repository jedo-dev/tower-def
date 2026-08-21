// Compares total wave health and average speed before and after the creature
// content migration. "Before" replays the deleted per-race tier formulas,
// "after" reads the authored JSON in src/content/units.
import { readFileSync } from 'node:fs';

const OLD_CURVES = {
  undead: { healthBase: 110, healthStep: 85, speedBase: 1.34, speedStep: 0.09 },
  orc: { healthBase: 120, healthStep: 90, speedBase: 1.28, speedStep: 0.08 },
  human: { healthBase: 100, healthStep: 80, speedBase: 1.4, speedStep: 0.1 },
  elf: { healthBase: 90, healthStep: 70, speedBase: 1.5, speedStep: 0.1 },
};

const TIER_VALUE = { 1: 1, 2: 2, 3: 3, 4: 5, 5: 7, 6: 10 };
const MIN_UNITS = 5;
const MAX_UNITS = 14;

function mulberry32(seed) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(candidates, random) {
  const sorted = [...candidates].sort((left, right) => right.tier - left.tier);
  const weighted = sorted.map((unit, index) => ({ unit, weight: sorted.length - index }));
  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  const roll = random() * total;
  let cumulative = 0;
  for (const item of weighted) {
    cumulative += item.weight;
    if (roll <= cumulative) return item.unit;
  }
  return weighted[weighted.length - 1].unit;
}

function generate(units, waveNumber, random) {
  let remaining = 8 + waveNumber * 3;
  const picked = [];
  while (remaining > 0 && picked.length < MAX_UNITS) {
    const affordable = units.filter((unit) => TIER_VALUE[unit.tier] <= remaining);
    if (affordable.length === 0) break;
    const unit = pick(affordable, random);
    picked.push(unit);
    remaining -= TIER_VALUE[unit.tier];
  }
  const fallback = units.find((unit) => unit.tier === 1) ?? units[0];
  while (picked.length < MIN_UNITS) picked.push(fallback);
  return picked;
}

function average(units, waveNumber, samples = 400) {
  let health = 0;
  let speed = 0;
  for (let sample = 0; sample < samples; sample += 1) {
    const wave = generate(units, waveNumber, mulberry32(sample * 7919 + waveNumber));
    health += wave.reduce((sum, unit) => sum + unit.health, 0);
    speed += wave.reduce((sum, unit) => sum + unit.speed, 0) / wave.length;
  }
  return { health: Math.round(health / samples), speed: Number((speed / samples).toFixed(2)) };
}

for (const race of Object.keys(OLD_CURVES)) {
  const authored = JSON.parse(readFileSync(`src/content/units/${race}.json`, 'utf8')).units;
  const curve = OLD_CURVES[race];
  const previous = authored.map((unit) => ({
    tier: unit.tier,
    health: curve.healthBase + (unit.tier - 1) * curve.healthStep,
    speed: Number((curve.speedBase - (unit.tier - 1) * curve.speedStep).toFixed(2)),
  }));

  console.log(`\n${race.toUpperCase()}  wave | old hp | new hp | delta % | old spd | new spd`);
  for (const wave of [1, 5, 10, 20]) {
    const before = average(previous, wave);
    const after = average(authored, wave);
    const delta = (((after.health - before.health) / before.health) * 100).toFixed(1);
    console.log(
      `${String(wave).padStart(11)} | ${String(before.health).padStart(6)} | ${String(after.health).padStart(6)} | ${String(delta).padStart(7)} | ${String(before.speed).padStart(7)} | ${String(after.speed).padStart(7)}`,
    );
  }
}
