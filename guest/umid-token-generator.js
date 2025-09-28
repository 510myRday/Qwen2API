const puppeteer = require('puppeteer')
const { logger } = require('../src/utils/logger')

/**
 * UmidToken 生成器 - 通过真实浏览器环境获取 token
 */
class UmidTokenGenerator {
  constructor() {
    this.browser = null
    this.page = null
    this.isInitialized = false
    this.tokenCache = null
    this.cacheExpiry = null
    this.initPromise = null
    this.tokenCacheDuration = 5 * 60 * 1000 // 5分钟缓存
  }

  /**
   * 初始化浏览器实例
   */
  async initBrowser() {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = this._initBrowser()
    return this.initPromise
  }

  async _initBrowser() {
    try {
      logger.info('启动 Puppeteer 浏览器...', 'UMID')
      
      this.browser = await puppeteer.launch({
        headless: false, // 使用真实浏览器模式
        devtools: false, // 关闭开发者工具
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-blink-features=AutomationControlled',
          '--disable-automation',
          '--disable-extensions',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-component-extensions-with-background-pages',
          '--disable-background-networking',
          '--disable-background-timer-throttling',
          '--disable-renderer-backgrounding',
          '--disable-backgrounding-occluded-windows',
          '--disable-ipc-flooding-protection',
          '--window-size=1920,1080'
        ]
      })

      this.page = await this.browser.newPage()

      // 设置用户代理
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36')

      // 设置视口
      await this.page.setViewport({ width: 1920, height: 1080 })

      // 增强反检测能力
      await this.page.evaluateOnNewDocument(() => {
        // 隐藏 webdriver 特征
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        })

        // 隐藏自动化特征
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise
        delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol

        // 模拟真实浏览器特征
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5]
        })

        Object.defineProperty(navigator, 'languages', {
          get: () => ['zh-CN', 'zh', 'en']
        })

        // 覆盖 chrome 对象
        window.chrome = {
          runtime: {}
        }
      })
      
      logger.info('浏览器初始化完成', 'UMID')
      this.isInitialized = true
      
    } catch (error) {
      logger.error('浏览器初始化失败', 'UMID', '', error)
      throw error
    }
  }

  /**
   * 获取 UmidToken
   */
  async generateToken() {
    try {
      // 检查缓存
      if (this.tokenCache && this.cacheExpiry && Date.now() < this.cacheExpiry) {
        logger.info('使用缓存的 UmidToken', 'UMID')
        return this.tokenCache
      }

      // 确保浏览器已初始化
      if (!this.isInitialized) {
        await this.initBrowser()
      }

      logger.info('开始获取新的 UmidToken...', 'UMID')

      // 访问 Qwen 页面
      await this.page.goto('https://chat.qwen.ai/', {
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      // 等待页面加载完成和 AWSC 模块加载
      await new Promise(resolve => setTimeout(resolve, 5000)) // 增加等待时间

      // 尝试获取 UmidToken
      const token = await this.extractUmidToken()

      if (token && token !== 'default_token') {
        // 缓存 token
        this.tokenCache = token
        this.cacheExpiry = Date.now() + this.tokenCacheDuration

        logger.info(`成功获取 UmidToken: ${token.substring(0, 20)}...`, 'UMID')
        return token
      } else {
        throw new Error('无法获取有效的 UmidToken')
      }

    } catch (error) {
      logger.error('获取 UmidToken 失败', 'UMID', '', error)
      throw error // 直接抛出错误，不使用备用 token
    }
  }

  /**
   * 从页面中提取 UmidToken
   */
  async extractUmidToken() {
    try {
      // 等待 AWSC 和 WebUMID 模块加载
      await this.page.waitForFunction(() => {
        return window.AWSC && window.AWSC.use
      }, { timeout: 10000 })

      logger.info('AWSC 模块已加载，开始生成 UmidToken...', 'UMID')

      // 使用 AWSC WebUMID 模块生成 token
      let token = null
      let attempts = 0
      const maxAttempts = 3

      while (!token && attempts < maxAttempts) {
        attempts++
        logger.info(`尝试生成 UmidToken (第 ${attempts} 次)...`, 'UMID')

        try {
          token = await this.page.evaluate(() => {
            return new Promise((resolve) => {
              const timeout = setTimeout(() => {
                resolve(null)
              }, 10000) // 减少超时时间

              if (window.AWSC && window.AWSC.use) {
                window.AWSC.use('um', (status, umModule) => {
                  if (status === 'loaded' && umModule) {
                    try {
                      umModule.init({
                        serviceLocation: 'cn'
                      }, (result, tokenData) => {
                        clearTimeout(timeout)
                        if (result === 'success' && tokenData && tokenData.tn) {
                          resolve(tokenData.tn)
                        } else {
                          resolve(null)
                        }
                      })
                    } catch (e) {
                      clearTimeout(timeout)
                      resolve(null)
                    }
                  } else {
                    clearTimeout(timeout)
                    resolve(null)
                  }
                })
              } else {
                clearTimeout(timeout)
                resolve(null)
              }
            })
          })

          if (token) {
            break
          }
        } catch (error) {
          logger.warn(`第 ${attempts} 次尝试失败: ${error.message}`, 'UMID')
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)) // 等待1秒后重试
          }
        }
      }

      if (token) {
        logger.success(`成功通过 AWSC 生成 UmidToken: ${token.substring(0, 20)}...`, 'UMID')
        return token
      }

      throw new Error(`AWSC WebUMID 模块生成 token 失败 (尝试了 ${maxAttempts} 次)`)

    } catch (error) {
      logger.error('提取 UmidToken 失败', 'UMID', '', error)
      throw error
    }
  }



  /**
   * 清理资源
   */
  async cleanup() {
    try {
      if (this.page) {
        await this.page.close()
        this.page = null
      }
      
      if (this.browser) {
        await this.browser.close()
        this.browser = null
      }
      
      this.isInitialized = false
      this.tokenCache = null
      this.cacheExpiry = null
      this.initPromise = null
      
      logger.info('浏览器资源已清理', 'UMID')
    } catch (error) {
      logger.error('清理浏览器资源失败', 'UMID', '', error)
    }
  }

  /**
   * 重置缓存
   */
  resetCache() {
    this.tokenCache = null
    this.cacheExpiry = null
    logger.info('UmidToken 缓存已重置', 'UMID')
  }
}

module.exports = UmidTokenGenerator
