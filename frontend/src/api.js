const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5050';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body.ok === false) {
    throw new Error(body.error || `Request failed: ${response.status}`);
  }

  return body.data;
}

export function getSummary() {
  return request('/api/summary');
}

export function getIssues() {
  return request('/api/issues');
}

export function getFixes() {
  return request('/api/fixes');
}

export function getHistory() {
  return request('/api/history');
}

export function triggerScan(repositoryPath) {
  return request('/api/scan', {
    method: 'POST',
    body: JSON.stringify(repositoryPath ? { repositoryPath } : {})
  });
}

export function simulateFix(fixId) {
  return request(`/api/simulate/${fixId}`, {
    method: 'POST'
  });
}

export function applyFix(fixId) {
  return request(`/api/apply/${fixId}`, {
    method: 'POST'
  });
}
