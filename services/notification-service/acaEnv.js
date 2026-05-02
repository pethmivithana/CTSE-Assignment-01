'use strict';

const LOCAL_DEFAULT = 'http://localhost:5002';

function onAzureContainerApps() {
  return Boolean(process.env.CONTAINER_APP_NAME || process.env.CONTAINER_APP_ENV_DNS_SUFFIX);
}

function applyAcaUserServiceUrl() {
  const cur = process.env.USER_SERVICE_URL;
  const unset = !cur || String(cur).trim() === '';
  const stillDefault = cur === LOCAL_DEFAULT;
  if (!unset && !stillDefault) return;
  if (!onAzureContainerApps()) return;

  const app = process.env.USER_SERVICE_ACA_APP || 'user-service';
  const scheme = (process.env.ACA_UPSTREAM_SCHEME || 'http').toLowerCase();
  if (scheme === 'http') {
    process.env.USER_SERVICE_URL = `http://${app}`;
    console.log('[acaEnv] USER_SERVICE_URL ->', process.env.USER_SERVICE_URL);
    return;
  }
  const suffix = process.env.CONTAINER_APP_ENV_DNS_SUFFIX;
  if (!suffix) return;
  const internal =
    String(process.env.ACA_SERVICES_INTERNAL_INGRESS || process.env.ACA_USE_INTERNAL_UPSTREAMS || '')
      .toLowerCase() === 'true';
  const host = internal ? `${app}.internal.${suffix}` : `${app}.${suffix}`;
  process.env.USER_SERVICE_URL = `https://${host}`;
  console.log('[acaEnv] USER_SERVICE_URL ->', process.env.USER_SERVICE_URL);
}

module.exports = { applyAcaUserServiceUrl };
