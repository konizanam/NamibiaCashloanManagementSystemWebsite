import { badRequest } from './errors.js';

export interface PolicyCheck {
  key: string;
  label: string;
  passed: boolean;
}

/**
 * Runs every rule against the input and returns the per-rule results. Used by
 * both the validator and (when exposed) the frontend for live feedback.
 */
export function checkPasswordPolicy(password: string): PolicyCheck[] {
  return [
    { key: 'length',  label: 'At least 8 characters',           passed: password.length >= 8 },
    { key: 'upper',   label: 'One uppercase letter (A–Z)',       passed: /[A-Z]/.test(password) },
    { key: 'lower',   label: 'One lowercase letter (a–z)',       passed: /[a-z]/.test(password) },
    { key: 'digit',   label: 'One digit (0–9)',                  passed: /\d/.test(password) },
    { key: 'symbol',  label: 'One symbol (!@#$%, etc.)',         passed: /[^A-Za-z0-9]/.test(password) },
    { key: 'noSpace', label: 'No spaces',                        passed: !/\s/.test(password) && password.length > 0 },
  ];
}

/**
 * Throws a 400 if the password fails any rule. The error message lists every
 * unmet rule so the caller (or its API client) can explain it back to the user.
 */
export function enforcePasswordPolicy(password: string): void {
  const failed = checkPasswordPolicy(password).filter((r) => !r.passed);
  if (failed.length === 0) return;
  throw badRequest(
    `Password does not meet the policy: ${failed.map((f) => f.label.toLowerCase()).join(', ')}.`,
    { failed: failed.map((f) => f.key) },
  );
}
