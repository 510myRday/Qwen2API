const GuestImageGenerator = require('./guest-image-generator')
const { logger } = require('../src/utils/logger')

/**
 * Guest 模式文生图入口文件
 */

/**
 * 创建 Guest 图片生成器实例
 * @returns {GuestImageGenerator} 图片生成器实例
 */
function createGuestImageGenerator() {
  return new GuestImageGenerator()
}

/**
 * 快速生成图片
 * @param {string} prompt - 图片描述提示词
 * @param {string} size - 图片尺寸，可选值: '1:1', '16:9', '9:16', '4:3', '3:4'
 * @returns {Promise<Object>} 生成结果
 */
async function generateImage(prompt, size = '1:1') {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('提示词不能为空且必须是字符串')
  }

  const generator = createGuestImageGenerator()
  return await generator.generateImageOneStep(prompt, size)
}

/**
 * 批量生成图片
 * @param {Array<Object>} requests - 请求数组，每个对象包含 { prompt, size? }
 * @returns {Promise<Array<Object>>} 生成结果数组
 */
async function generateImagesBatch(requests) {
  if (!Array.isArray(requests) || requests.length === 0) {
    throw new Error('请求数组不能为空')
  }

  const generator = createGuestImageGenerator()
  const results = []

  for (const request of requests) {
    try {
      const { prompt, size = '1:1' } = request
      if (!prompt) {
        logger.warn('跳过空提示词的请求', 'GUEST')
        continue
      }

      logger.info(`处理批量请求: ${prompt}`, 'GUEST')
      const result = await generator.generateImageOneStep(prompt, size)
      results.push({
        success: true,
        ...result
      })
      
      // 添加延迟避免请求过于频繁
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (error) {
      logger.error(`批量生成失败: ${request.prompt}`, 'GUEST', '', error)
      results.push({
        success: false,
        prompt: request.prompt,
        error: error.message
      })
    }
  }

  return results
}

/**
 * 使用现有聊天会话生成图片
 * @param {string} chatId - 现有的聊天会话 ID
 * @param {string} prompt - 图片描述提示词
 * @param {string} size - 图片尺寸
 * @returns {Promise<string>} 图片 URL
 */
async function generateImageWithExistingChat(chatId, prompt, size = '1:1') {
  if (!chatId || !prompt) {
    throw new Error('聊天 ID 和提示词不能为空')
  }

  const generator = createGuestImageGenerator()
  return await generator.generateImage(chatId, prompt, size)
}

/**
 * 创建新的聊天会话
 * @param {string} chatType - 聊天类型，默认为 't2i'
 * @returns {Promise<string>} 聊天会话 ID
 */
async function createNewChatSession(chatType = 't2i') {
  const generator = createGuestImageGenerator()
  return await generator.createNewChat(chatType)
}

// 导出主要功能
module.exports = {
  // 类导出
  GuestImageGenerator,
  
  // 工厂函数
  createGuestImageGenerator,
  
  // 便捷函数
  generateImage,
  generateImagesBatch,
  generateImageWithExistingChat,
  createNewChatSession,
  
  // 配置导出
  config: require('./guest-config')
}

// 如果直接运行此文件，提供命令行接口
if (require.main === module) {
  const args = process.argv.slice(2)
  
  if (args.length === 0) {
    console.log('用法:')
    console.log('  node guest/index.js "图片描述提示词" [尺寸]')
    console.log('  尺寸可选值: 1:1, 16:9, 9:16, 4:3, 3:4')
    console.log('  示例: node guest/index.js "一只可爱的小猫" "1:1"')
    process.exit(1)
  }

  const prompt = args[0]
  const size = args[1] || '1:1'

  generateImage(prompt, size)
    .then(result => {
      console.log('生成成功!')
      console.log('聊天 ID:', result.chatId)
      console.log('图片 URL:', result.imageUrl)
      console.log('提示词:', result.prompt)
      console.log('尺寸:', result.size)
    })
    .catch(error => {
      console.error('生成失败:', error.message)
      process.exit(1)
    })
}

/**
 * 清理所有 Guest 模式资源
 * @returns {Promise<void>}
 */
async function cleanup() {
  const generator = createGuestImageGenerator()
  await generator.cleanup()
}

/**
 * 重置 token 缓存
 */
function resetTokenCache() {
  const generator = createGuestImageGenerator()
  generator.resetTokenCache()
}

// 导出清理函数
module.exports.cleanup = cleanup
module.exports.resetTokenCache = resetTokenCache
