/**
 * Guest 模式文生图配置
 */

const GUEST_CONFIG = {
  // Qwen API 基础配置
  baseURL: 'https://chat.qwen.ai',
  
  // 随机化请求头配置
  randomHeaders: {
    'sec-ch-ua': [
      '"Google Chrome";v="140", "Chromium";v="140", "Not=A?Brand";v="24"',
      '"Microsoft Edge";v="140", "Chromium";v="140", "Not=A?Brand";v="24"',
      '"Chromium";v="140", "Not=A?Brand";v="24"',
      '"Google Chrome";v="139", "Chromium";v="139", "Not=A?Brand";v="24"'
    ],
    'sec-ch-ua-mobile': ['?0', '?1'],
    'sec-ch-ua-platform': ['"Windows"', '"macOS"', '"Linux"'],
    'sec-fetch-dest': ['empty', 'document', 'script'],
    'sec-fetch-mode': ['cors', 'navigate', 'no-cors'],
    'sec-fetch-site': ['same-origin', 'cross-site'],
    'source': ['web', 'mobile'],
    'User-Agent': [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/140.0.0.0 Safari/537.36'
    ]
  },
  
  // 请求头配置
  defaultHeaders: {
    'accept': 'application/json',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'content-type': 'application/json; charset=UTF-8',
    'sec-ch-ua': '"Google Chrome";v="140", "Chromium";v="140", "Not=A?Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'empty',
    'sec-fetch-mode': 'cors',
    'sec-fetch-site': 'same-origin',
    'source': 'web',
    'Referer': 'https://chat.qwen.ai/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
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
    delay: 2000
  },

  /**
   * 随机选择数组中的一个元素
   * @param {Array} array - 数组
   * @returns {*} 随机选择的元素
   */
  getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)]
  },

  /**
   * 生成随机化请求头
   * @returns {Object} 随机化的请求头
   */
  generateRandomHeaders() {
    const randomHeaders = {}
    
    // 随机化可以变化的头部字段
    for (const [key, values] of Object.entries(this.randomHeaders)) {
      randomHeaders[key] = this.getRandomElement(values)
    }
    
    // 随机化Referer
    const referers = [
      'https://chat.qwen.ai/',
      'https://chat.qwen.ai/c/guest',
      'https://chat.qwen.ai/c',
      'https://www.qwen.ai/'
    ]
    randomHeaders['Referer'] = this.getRandomElement(referers)
    
    return randomHeaders
  },

  /**
   * 生成请求头配置
   * @param {Object} metadata - 请求元数据
   * @param {string} dynamicUmidToken - 动态UMID token
   * @param {Function} generateBrowserFingerprint - 浏览器指纹生成函数
   * @param {boolean} includeChatHeaders - 是否包含聊天头信息，默认为false
   * @param {boolean} includeReferer - 是否包含Referer头，默认为false
   * @param {boolean} useRandomHeaders - 是否使用随机化请求头，默认为true
   * @returns {Object} 完整的请求头配置
   */
  generateHeaders(metadata, dynamicUmidToken, generateBrowserFingerprint, includeChatHeaders = false, includeReferer = false, useRandomHeaders = true) {
    // 获取基础头部配置
    let baseHeaders = this.defaultHeaders
    
    // 如果使用随机化请求头
    if (useRandomHeaders) {
      baseHeaders = {
        ...this.defaultHeaders,
        ...this.generateRandomHeaders()
      }
    }
    
    const headers = {
      ...baseHeaders,
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

    // 如果需要包含Referer头（且使用随机化时不再覆盖）
    if (includeReferer && !useRandomHeaders) {
      headers['Referer'] = 'https://chat.qwen.ai/c/guest'
    }

    return headers
  }
}

module.exports = GUEST_CONFIG
