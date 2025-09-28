const UmidTokenGenerator = require('./umid-token-generator')

/**
 * 测试 UmidToken 生成器
 */
async function testTokenGenerator() {
  const generator = new UmidTokenGenerator()
  
  try {
    console.log('开始测试 UmidToken 生成器...')
    
    // 测试生成 token
    const token1 = await generator.generateToken()
    console.log('第一次生成的 token:', token1)
    
    // 测试缓存功能
    const token2 = await generator.generateToken()
    console.log('第二次生成的 token (应该使用缓存):', token2)
    
    // 重置缓存后再次生成
    generator.resetCache()
    const token3 = await generator.generateToken()
    console.log('重置缓存后生成的 token:', token3)
    
    console.log('测试完成!')
    
  } catch (error) {
    console.error('测试失败:', error)
  } finally {
    // 清理资源
    await generator.cleanup()
    console.log('资源已清理')
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  testTokenGenerator()
}

module.exports = testTokenGenerator
