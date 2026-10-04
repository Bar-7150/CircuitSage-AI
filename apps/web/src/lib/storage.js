/**
 * CircuitSage AI — Local Client Storage Helper
 * Provides offline guest-session persistence in browser localStorage without requiring cloud credentials.
 */

const STORAGE_KEYS = {
  CASES: 'circuitsage_local_cases_v1',
  DEMO_MODE: 'circuitsage_demo_mode_v1',
  API_URL_OVERRIDE: 'circuitsage_api_url_override_v1'
};

function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * Retrieves all locally saved diagnostic cases for guest users.
 */
export function getLocalCases() {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CASES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read local cases from localStorage', err);
    return [];
  }
}

/**
 * Saves or updates a diagnostic case in localStorage.
 */
export function saveLocalCase(diagnosisResult) {
  if (!isBrowser() || !diagnosisResult) return null;
  try {
    const cases = getLocalCases();
    const caseId = diagnosisResult.case?.id || `case-local-${Date.now()}`;
    const preparedCase = {
      ...diagnosisResult,
      case: {
        ...diagnosisResult.case,
        id: caseId,
        updated_at: new Date().toISOString()
      }
    };

    const existingIndex = cases.findIndex((c) => c.case?.id === caseId);
    if (existingIndex >= 0) {
      cases[existingIndex] = preparedCase;
    } else {
      cases.unshift(preparedCase);
    }

    localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(cases));
    return preparedCase;
  } catch (err) {
    console.error('Failed to save case to localStorage', err);
    return null;
  }
}

/**
 * Finds a specific case by its ID in localStorage.
 */
export function getLocalCaseById(id) {
  if (!isBrowser() || !id) return null;
  const cases = getLocalCases();
  return cases.find((c) => c.case?.id === id) || null;
}

/**
 * Deletes a specific case by its ID in localStorage.
 */
export function deleteLocalCase(id) {
  if (!isBrowser() || !id) return false;
  try {
    const cases = getLocalCases();
    const filtered = cases.filter((c) => c.case?.id !== id);
    localStorage.setItem(STORAGE_KEYS.CASES, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete case from localStorage', err);
    return false;
  }
}

/**
 * Checks if Development / Demo mode is active.
 */
export function isDemoMode() {
  if (!isBrowser()) return false;
  try {
    const val = localStorage.getItem(STORAGE_KEYS.DEMO_MODE);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Toggles or sets Development / Demo mode.
 */
export function setDemoMode(enabled) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEYS.DEMO_MODE, enabled ? 'true' : 'false');
    window.dispatchEvent(new Event('circuitsage_demo_mode_changed'));
  } catch (err) {
    console.error('Failed to set demo mode', err);
  }
}

/**
 * Gets custom API URL override if set.
 */
export function getApiBaseUrlOverride() {
  if (!isBrowser()) return '';
  try {
    return localStorage.getItem(STORAGE_KEYS.API_URL_OVERRIDE) || '';
  } catch {
    return '';
  }
}

/**
 * Sets custom API URL override.
 */
export function setApiBaseUrlOverride(url) {
  if (!isBrowser()) return;
  try {
    if (!url) {
      localStorage.removeItem(STORAGE_KEYS.API_URL_OVERRIDE);
    } else {
      localStorage.setItem(STORAGE_KEYS.API_URL_OVERRIDE, url);
    }
  } catch (err) {
    console.error('Failed to persist API URL override', err);
  }
}
