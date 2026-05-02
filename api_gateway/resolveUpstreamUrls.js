'use strict';

/**
 * When the API gateway runs on Azure Container Apps, Azure injects
 * CONTAINER_APP_ENV_DNS_SUFFIX. Inter-app URLs must use each target app's
 * FQDN (https://<app>.<suffix> or https://<app>.internal.<suffix>), not localhost.
 *
 * @see https://learn.microsoft.com/en-us/azure/container-apps/environment-variables
 * @see https://learn.microsoft.com/en-us/azure/container-apps/connect-apps
 */

const LOCAL_DEFAULTS = {
  USER_SERVICE_URL: 'http://localhost:5002',
  RESTAURANT_SERVICE_URL: 'http://localhost:3002',
  ORDER_SERVICE_URL: 'http://localhost:3004',
  DELIVERY_SERVICE_URL: 'http://localhost:3003',
  NOTIFICATION_SERVICE_URL: 'http://localhost:3005',
  PAYMENT_SERVICE_URL: 'http://localhost:3006',
};

/**
 * Default Container App **resource names** (hostname for mesh `http://<name>` calls).
 * Must match `az containerapp list -g <rg> -o table` Name column.
 * This subscription uses: user-service, restaurant-service (not *-feedo).
 * Override per env: USER_SERVICE_ACA_APP, RESTAURANT_SERVICE_ACA_APP, …
 */
const DEFAULT_ACA_APP = {
  USER_SERVICE_URL: 'user-service',
  RESTAURANT_SERVICE_URL: 'restaurant-service',
  ORDER_SERVICE_URL: 'order-service-feedo',
  DELIVERY_SERVICE_URL: 'delivery-service',
  NOTIFICATION_SERVICE_URL: 'notification-service-feedo',
  PAYMENT_SERVICE_URL: 'payment-service-feedo',
};

const ACA_APP_ENV_SUFFIX = {
  USER_SERVICE_URL: 'USER_SERVICE_ACA_APP',
  RESTAURANT_SERVICE_URL: 'RESTAURANT_SERVICE_ACA_APP',
  ORDER_SERVICE_URL: 'ORDER_SERVICE_ACA_APP',
  DELIVERY_SERVICE_URL: 'DELIVERY_SERVICE_ACA_APP',
  NOTIFICATION_SERVICE_URL: 'NOTIFICATION_SERVICE_ACA_APP',
  PAYMENT_SERVICE_URL: 'PAYMENT_SERVICE_ACA_APP',
};

function isUnsetOrLocalDefault(envKey, value) {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  const def = LOCAL_DEFAULTS[envKey];
  return def != null && value === def;
}

function isAzureContainerApp() {
  return Boolean(process.env.CONTAINER_APP_NAME || process.env.CONTAINER_APP_ENV_DNS_SUFFIX);
}

/**
 * In-environment calls: Microsoft recommends http://<app-resource-name> (mesh DNS).
 * HTTPS FQDN needs CONTAINER_APP_ENV_DNS_SUFFIX — set ACA_UPSTREAM_SCHEME=https to use it.
 */
function buildAcaBaseUrl(appName) {
  if (!appName) return null;
  const scheme = (process.env.ACA_UPSTREAM_SCHEME || 'http').toLowerCase();
  if (scheme === 'http') {
    return `http://${appName}`;
  }
  const suffix = process.env.CONTAINER_APP_ENV_DNS_SUFFIX;
  if (!suffix) return null;
  const useInternal =
    String(process.env.ACA_SERVICES_INTERNAL_INGRESS || '').toLowerCase() === 'true' ||
    String(process.env.ACA_USE_INTERNAL_UPSTREAMS || '').toLowerCase() === 'true';
  const host = useInternal ? `${appName}.internal.${suffix}` : `${appName}.${suffix}`;
  return `https://${host}`;
}

/**
 * @param {string} envKey - e.g. USER_SERVICE_URL
 * @returns {string}
 */
function resolveUpstreamUrl(envKey) {
  const explicit = process.env[envKey];
  if (!isUnsetOrLocalDefault(envKey, explicit)) {
    return explicit;
  }
  if (!isAzureContainerApp()) {
    return explicit || LOCAL_DEFAULTS[envKey];
  }
  const overrideEnv = ACA_APP_ENV_SUFFIX[envKey];
  const appName =
    (overrideEnv && process.env[overrideEnv] && String(process.env[overrideEnv]).trim()) ||
    DEFAULT_ACA_APP[envKey];
  const built = buildAcaBaseUrl(appName);
  if (built) return built;
  return explicit || LOCAL_DEFAULTS[envKey];
}

function logResolvedUrls(urls) {
  if (!isAzureContainerApp()) return;
  console.log(
    '[Gateway] Azure Container Apps upstream URLs:',
    JSON.stringify(urls, null, 0)
  );
}

module.exports = {
  resolveUpstreamUrl,
  logResolvedUrls,
  LOCAL_DEFAULTS,
};
