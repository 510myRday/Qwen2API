/**
 * Guest 模式文生图配置
 */

const GUEST_CONFIG = {
  // Qwen API 基础配置
  baseURL: 'https://chat.qwen.ai',
  
  // 请求头配置
  defaultHeaders: {
    'accept': 'application/json',
    'accept-language': 'zh-CN,zh;q=0.9',
    'content-type': 'application/json; charset=UTF-8',
    'sec-ch-ua': '"Chromium";v="140", "Not=A?Brand";v="24", "Google Chrome";v="140"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'source': 'web',
    'Referer': 'https://chat.qwen.ai/'
  },

  // 聊天完成请求头（包含额外字段）
  chatHeaders: {
    'accept': '*/*',
    'authorization': 'Bearer',
    'x-accel-buffering': 'no'
  },

  // 默认模型配置
  defaultModel: 'qwen3-max',
  
  // 支持的图片尺寸
  supportedSizes: ['1:1', '16:9', '9:16', '4:3', '3:4'],
  
  // 默认图片尺寸
  defaultSize: '1:1',
  
  // 请求超时时间（毫秒）
  timeout: 30000,
  
  // 重试配置
  retry: {
    maxAttempts: 3,
    delay: 1000
  },

  /**
   * 生成请求头配置
   * @param {Object} metadata - 请求元数据
   * @param {string} dynamicUmidToken - 动态UMID token
   * @param {Function} generateBrowserFingerprint - 浏览器指纹生成函数
   * @param {boolean} includeChatHeaders - 是否包含聊天头信息，默认为false
   * @param {boolean} includeReferer - 是否包含Referer头，默认为false
   * @returns {Object} 完整的请求头配置
   */
  generateHeaders(metadata, dynamicUmidToken, generateBrowserFingerprint, includeChatHeaders = false, includeReferer = false) {
    const headers = {
      ...this.defaultHeaders,
      'bx-ua': generateBrowserFingerprint(),
      'bx-umidtoken': dynamicUmidToken,
      'bx-v': '2.5.31',
      'timezone': metadata.timezone,
      'x-request-id': metadata.requestId
    }

    // 如果需要包含聊天头信息
    if (includeChatHeaders) {
      Object.assign(headers, this.chatHeaders)
    }

    // 如果需要包含Referer头
    if (includeReferer) {
      headers['Referer'] = 'https://chat.qwen.ai/c/guest'
    }

    return headers
  }
}

module.exports = GUEST_CONFIG
