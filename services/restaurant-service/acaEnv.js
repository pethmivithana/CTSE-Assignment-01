'use strict';

/**
 * Azure Container Apps: set USER_SERVICE_URL from CONTAINER_APP_ENV_DNS_SUFFIX when unset
 * or still the local default (see api_gateway/resolveUpstreamUrls.js pattern).
 */
const LOCAL_DEFAULT = 'http://localhost:5002';

function applyAcaUserServiceUrl() {
  const cur = process.env.USER_SERVICE_URL;
  const unset = !cur || String(cur).trim() === '';
  const stillDefault = cur === LOCAL_DEFAULT;
  if (!unset && !stillDefault) return;

  const suffix = process.env.CONTAINER_APP_ENV_DNS_SUFFIX;
  if (!suffix) return;

  const app = process.env.USER_SERVICE_ACA_APP || 'user-service';
  const internal =
    String(process.env.ACA_SERVICES_INTERNAL_INGRESS || process.env.ACA_USE_INTERNAL_UPSTREAMS || '')
      .toLowerCase() === 'true';
  const host = internal ? `${app}.internal.${suffix}` : `${app}.${suffix}`;
  process.env.USER_SERVICE_URL = `https://${host}`;
  console.log('[acaEnv] USER_SERVICE_URL ->', process.env.USER_SERVICE_URL);
}

module.exports = { applyAcaUserServiceUrl };
