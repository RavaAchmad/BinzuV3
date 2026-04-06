import axios from 'axios';

const BASE_URL = 'https://ravaja.my.id';
const APIKEY = global.btc || 'ravaja';
const TIMEOUT = 15000;

/**
 * Call a Binzu API endpoint with automatic version fallback.
 * Tries v1 first, then v2, v3... up to maxVersion.
 * 
 * @param {string} category - e.g. 'download', 'ai', 'search', 'tools', 'maker', 'stalker', 'fun', 'sticker', 'info'
 * @param {string} name - e.g. 'tiktok', 'instagram', 'gemini'
 * @param {object} params - query parameters (url, text, query, etc.)
 * @param {object} [options] - { maxVersion, timeout, method }
 * @returns {Promise<object>} API response data
 */
export async function binzuApi(category, name, params = {}, options = {}) {
  const { maxVersion = 30, timeout = TIMEOUT, method = 'GET' } = options;
  let lastError = null;

  for (let v = 1; v <= maxVersion; v++) {
    const url = `${BASE_URL}/api/${category}/${name}/v${v}`;
    try {
      const config = {
        method,
        url,
        timeout,
        params: { ...params, apikey: APIKEY },
      };

      if (method === 'POST') {
        config.data = { ...params, apikey: APIKEY };
        delete config.params;
      }

      const { data } = await axios(config);

      // API returns { success: true, result: ... } on success
      if (data && (data.success || data.status || data.result)) {
        return data;
      }

      // Got response but marked as failed
      lastError = new Error(data?.message || data?.error || `v${v} returned unsuccessful`);
    } catch (err) {
      lastError = err;
      // Network timeout or 5xx -> try next version
      // 4xx (bad request) -> likely same for all versions, stop
      if (err.response?.status >= 400 && err.response?.status < 500) {
        throw new Error(err.response?.data?.message || err.response?.data?.error || err.message);
      }
      continue;
    }
  }

  throw lastError || new Error(`All ${maxVersion} versions failed for ${category}/${name}`);
}

/**
 * Shortcut: call a single-file API endpoint (no version subfolder).
 * e.g. /api/ai/gemini?text=hello
 */
export async function binzuApiSingle(path, params = {}, options = {}) {
  const { timeout = TIMEOUT, method = 'GET' } = options;
  const url = `${BASE_URL}/api/${path}`;

  const config = {
    method,
    url,
    timeout,
    params: { ...params, apikey: APIKEY },
  };

  if (method === 'POST') {
    config.data = { ...params, apikey: APIKEY };
    delete config.params;
  }

  const { data } = await axios(config);
  return data;
}

/**
 * Smart downloader - tries versioned endpoint with fallback.
 */
export async function binzuDownload(name, url, extra = {}) {
  return binzuApi('download', name, { url, ...extra });
}

/**
 * Smart AI call - tries versioned endpoint with fallback.
 */
export async function binzuAI(name, params = {}) {
  return binzuApi('ai', name, params);
}

/**
 * Smart search - tries versioned endpoint with fallback.
 */
export async function binzuSearch(name, query, extra = {}) {
  return binzuApi('search', name, { query, ...extra });
}

/**
 * Smart tools call.
 */
export async function binzuTools(name, params = {}) {
  return binzuApi('tools', name, params);
}

/**
 * Smart stalker call.
 */
export async function binzuStalker(name, username, extra = {}) {
  return binzuApi('stalker', name, { username, ...extra });
}

/**
 * Smart maker call.
 */
export async function binzuMaker(name, params = {}) {
  return binzuApi('maker', name, params);
}

/**
 * Smart sticker call.
 */
export async function binzuSticker(name, params = {}) {
  return binzuApi('sticker', name, params);
}

export default {
  binzuApi,
  binzuApiSingle,
  binzuDownload,
  binzuAI,
  binzuSearch,
  binzuTools,
  binzuStalker,
  binzuMaker,
  binzuSticker,
};
