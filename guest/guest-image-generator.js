const axios = require('axios')
const crypto = require('crypto')
const { logger } = require('../src/utils/logger')
const GUEST_CONFIG = require('./guest-config')
const { generateUmidToken } = require('./umid-token-generator')


class GuestImageGenerator {
  constructor() {
    this.config = GUEST_CONFIG
    this.axiosInstance = this.createAxiosInstance()
    this.dynamicUmidToken = null
    this.initPromise = this.initializeUmidToken()
  }

  /**
   * 初始化UMID token
   */
  async initializeUmidToken() {
    try {
      this.dynamicUmidToken = await generateUmidToken()
    } catch (error) {
      console.error('初始化UMID token失败:', error.message)
      // 可以设置一个默认值或抛出错误
      throw error
    }
  }

  /**
   * 创建 axios 实例
   */
  createAxiosInstance() {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.defaultHeaders
    })
  }

  /**
   * 生成 UUID v4
   */
  generateUUID() {
    return crypto.randomUUID()
  }

  /**
   * 生成随机的浏览器指纹和时间戳
   */
  generateRequestMetadata() {
    const timestamp = Date.now()
    const requestId = this.generateUUID()
    const timezone = new Date().toString().match(/GMT[+-]\d{4}/)?.[0] || 'GMT+0800'

    return {
      timestamp,
      requestId,
      timezone: `${new Date().toDateString()} ${new Date().toTimeString().split(' ')[0]} ${timezone}`
    }
  }

  /**
   * 生成模拟的浏览器指纹
   */
  generateBrowserFingerprint() {
    // 简化的浏览器指纹生成
    const randomString = Math.random().toString(36).substring(2, 15)
    return `231!${randomString}${Date.now()}`
  }

  /**
   * 创建新的聊天会话
   * @param {string} chatType - 聊天类型，默认为 't2i'
   * @returns {Promise<string>} 聊天会话 ID
   */
  async createNewChat(chatType = 't2i') {
    try {
      await this.initPromise;
      const metadata = this.generateRequestMetadata()

      const requestData = {
        title: '新建对话',
        models: [this.config.defaultModel],
        chat_mode: 'guest',
        chat_type: chatType,
        timestamp: metadata.timestamp
      }

      const headers = this.config.generateHeaders(
        metadata,
        this.dynamicUmidToken,
        this.generateBrowserFingerprint.bind(this),
        false,
        false
      )

      logger.info('创建新的聊天会话...', 'GUEST')
      
      const response = await this.axiosInstance.post('/api/v2/chats/new', requestData, { headers })
      console.log(response.data)
      if (response.data?.success && response.data?.data?.id) {
        const chatId = response.data.data.id
        logger.success(`聊天会话创建成功: ${chatId}`, 'GUEST')
        return chatId
      } else {
        throw new Error('创建聊天会话失败: 响应格式不正确')
      }
    } catch (error) {
      logger.error('创建聊天会话失败', 'GUEST', '', error)
      throw error
    }
  }

  /**
   * 生成图片
   * @param {string} chatId - 聊天会话 ID
   * @param {string} prompt - 图片描述提示词
   * @param {string} size - 图片尺寸，默认为 '1:1'
   * @returns {Promise<string>} 图片 URL
   */
  async generateImage(chatId, prompt, size = '1:1') {
    try {
      await this.initPromise;
      if (!this.config.supportedSizes.includes(size)) {
        logger.warn(`不支持的图片尺寸: ${size}，使用默认尺寸: ${this.config.defaultSize}`, 'GUEST')
        size = this.config.defaultSize
      }

      const metadata = this.generateRequestMetadata()
      const messageId = this.generateUUID()

      const requestData = {
        stream: true,
        incremental_output: true,
        chat_id: chatId,
        chat_mode: 'guest',
        model: this.config.defaultModel,
        parent_id: null,
        messages: [{
          fid: messageId,
          parentId: null,
          childrenIds: [],
          role: 'user',
          content: prompt,
          user_action: 'chat',
          files: [],
          timestamp: Math.floor(metadata.timestamp / 1000),
          models: [this.config.defaultModel],
          chat_type: 't2i',
          feature_config: {
            thinking_enabled: false,
            output_schema: 'phase'
          },
          extra: {
            meta: {
              subChatType: 't2i'
            }
          },
          sub_chat_type: 't2i',
          parent_id: null
        }],
        timestamp: Math.floor(metadata.timestamp / 1000),
        size: size
      }

      const headers = this.config.generateHeaders(
        metadata,
        this.dynamicUmidToken,
        this.generateBrowserFingerprint.bind(this),
        true,
        true
      )

      logger.info(`开始生成图片，提示词: ${prompt}`, 'GUEST')
      
      const response = await this.axiosInstance.post(
        `/api/v2/chat/completions?chat_id=${chatId}`,
        requestData,
        { 
          headers,
          responseType: 'stream'
        }
      )

      return await this.parseStreamResponse(response.data)
    } catch (error) {
      logger.error('生成图片失败', 'GUEST', '', error)
      throw error
    }
  }

  /**
   * 解析流式响应，提取图片 URL
   * @param {Stream} stream - 响应流
   * @returns {Promise<string>} 图片 URL
   */
  async parseStreamResponse(stream) {
    return new Promise((resolve, reject) => {
      let buffer = ''
      let imageUrl = null
      let allResponses = [] // 收集所有响应用于调试

      stream.on('data', (chunk) => {
        const chunkStr = chunk.toString()
        logger.info(`收到原始数据块: ${chunkStr}`, 'GUEST')

        // 检查是否是错误响应（非流式）
        try {
          const errorResponse = JSON.parse(chunkStr)
          if (errorResponse.success === false) {
            logger.error('收到错误响应:', 'GUEST', '', errorResponse)
            if (errorResponse.data?.code === 'RateLimited') {
              reject(new Error(`请求被限制: ${errorResponse.data.details}`))
              return
            } else {
              reject(new Error(`请求失败: ${errorResponse.data?.details || '未知错误'}`))
              return
            }
          }
        } catch (e) {
          // 不是JSON格式，继续处理流式数据
        }

        buffer += chunkStr

        // 按行处理数据
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后一个不完整的行

        for (const line of lines) {
          logger.info(`处理行: ${line}`, 'GUEST')

          if (line.startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6)
              logger.info(`提取JSON字符串: ${jsonStr}`, 'GUEST')

              if (jsonStr.trim() === '[DONE]') {
                logger.info('收到流结束标记: [DONE]', 'GUEST')
                continue
              }

              const data = JSON.parse(jsonStr)
              allResponses.push(data) // 收集响应用于调试

              // 详细日志记录
              logger.info(`解析后的数据: ${JSON.stringify(data)}`, 'GUEST')

              // 检查是否包含图片 URL
              if (data.choices?.[0]?.delta?.content) {
                const content = data.choices[0].delta.content
                logger.info(`检查delta内容: ${content}`, 'GUEST')

                // 更宽泛的URL匹配 - 检查是否包含图片URL
                if (content.includes('cdn.qwenlm.ai') ||
                    content.includes('.png') ||
                    content.includes('.jpg') ||
                    content.includes('.jpeg') ||
                    content.startsWith('https://')) {
                  imageUrl = content.trim()
                  logger.success(`图片生成成功: ${imageUrl}`, 'GUEST')
                }
              }

              // 检查其他可能包含图片URL的字段
              if (data.choices?.[0]?.message?.content) {
                const content = data.choices[0].message.content
                logger.info(`检查message内容: ${content}`, 'GUEST')

                if (content.includes('cdn.qwenlm.ai') ||
                    content.includes('.png') ||
                    content.includes('.jpg') ||
                    content.includes('.jpeg') ||
                    content.startsWith('https://')) {
                  imageUrl = content.trim()
                  logger.success(`从message中获取图片URL: ${imageUrl}`, 'GUEST')
                }
              }

              // 检查是否完成
              if (data.choices?.[0]?.delta?.status === 'finished' ||
                  data.choices?.[0]?.finish_reason === 'stop') {
                logger.info('检测到完成状态', 'GUEST')
                if (imageUrl) {
                  resolve(imageUrl)
                } else {
                  logger.error('完成但未获取到图片URL，所有响应:', 'GUEST', '', { allResponses })
                  reject(new Error('未能获取到图片 URL'))
                }
                return
              }
            } catch (parseError) {
              logger.warn(`解析JSON失败，原始行: ${line}`, 'GUEST', '', parseError)
              // 忽略解析错误，继续处理下一行
            }
          } else if (line.trim() !== '') {
            // 记录非data:开头的行
            logger.info(`非data行: ${line}`, 'GUEST')
          }
        }
      })

      stream.on('end', () => {
        logger.info('流结束', 'GUEST')
        logger.info(`所有收到的响应: ${JSON.stringify(allResponses, null, 2)}`, 'GUEST')

        if (imageUrl) {
          resolve(imageUrl)
        } else {
          logger.error('流结束但未获取到图片URL，完整响应数据:', 'GUEST', '', { allResponses })
          reject(new Error('流结束但未获取到图片 URL'))
        }
      })

      stream.on('error', (error) => {
        logger.error('流错误', 'GUEST', '', error)
        reject(error)
      })
    })
  }

  /**
   * 一键生成图片（创建会话 + 生成图片）
   * @param {string} prompt - 图片描述提示词
   * @param {string} size - 图片尺寸，默认为 '1:1'
   * @returns {Promise<Object>} 包含聊天 ID 和图片 URL 的对象
   */
  async generateImageOneStep(prompt, size = '1:1') {
    try {
      const chatId = await this.createNewChat('t2i')
      const imageUrl = await this.generateImage(chatId, prompt, size)
      
      return {
        chatId,
        imageUrl,
        prompt,
        size
      }
    } catch (error) {
      logger.error('一键生成图片失败', 'GUEST', '', error)
      throw error
    }
  }
}

module.exports = GuestImageGenerator
