export const UNVERIFIED_FLAG = 'Unverified — Human Review Required';
export const VERIFIED_GENUINE_FLAG = 'Verified Genuine (Human Reviewed)';
export const FLAGGED_SUSPICIOUS_FLAG = 'Flagged after Human Review';

export function isFlaggedSuspicious(flag) {
  return flag === FLAGGED_SUSPICIOUS_FLAG;
}

export function isVerifiedGenuine(flag) {
  return flag === VERIFIED_GENUINE_FLAG;
}

export function isUnverified(flag) {
  return !isFlaggedSuspicious(flag) && !isVerifiedGenuine(flag);
}
