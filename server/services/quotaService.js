const fs = require('fs');
const path = require('path');

const QUOTA_FILE = path.join(__dirname, '../.provider-quotas.json');

function getQuotaState() {
  try {
    const state = JSON.parse(fs.readFileSync(QUOTA_FILE, 'utf8'));
    if (!state || typeof state !== 'object' || Array.isArray(state)) {
      throw new Error('Provider quota state is invalid.');
    }
    return state;
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new Error(`Could not read provider quota state: ${error.message}`);
  }
}

function getDailyUsage(provider) {
  const state = getQuotaState();
  const entry = state[provider];
  const today = new Date().toISOString().slice(0, 10);
  if (!entry || entry.day !== today || !Number.isInteger(entry.used) || entry.used < 0) return 0;
  return entry.used;
}

function consumeDailyQuota(provider, dailyLimit) {
  const state = getQuotaState();
  const today = new Date().toISOString().slice(0, 10);
  const entry = state[provider];
  const used = entry?.day === today && Number.isInteger(entry.used) && entry.used >= 0
    ? entry.used
    : 0;

  if (used >= dailyLimit) {
    const error = new Error(`${provider} daily safety limit reached. Try again after 00:00 UTC.`);
    error.status = 429;
    throw error;
  }

  state[provider] = { day: today, used: used + 1 };
  const temporaryFile = `${QUOTA_FILE}.tmp`;
  try {
    fs.writeFileSync(temporaryFile, JSON.stringify(state), { encoding: 'utf8', mode: 0o600 });
    fs.renameSync(temporaryFile, QUOTA_FILE);
  } catch (error) {
    throw new Error(`Could not persist ${provider} quota usage: ${error.message}`);
  }
  return used + 1;
}

module.exports = { consumeDailyQuota, getDailyUsage };
