# Guest 模式图像生成器

## 概述

Guest 模式提供免认证的图像生成服务，通过真实浏览器环境获取 UmidToken，确保稳定性和可靠性。

## 新特性

### 🚀 真实浏览器环境
- 使用 Puppeteer 启动真实的 Chrome 浏览器
- 自动访问 Qwen 官方页面获取真实 token
- 完全模拟真实用户行为，避免反爬虫检测

### 💾 智能缓存机制
- Token 缓存 5 分钟，减少浏览器启动次数
- 自动检测 token 有效性
- 支持手动重置缓存

### 🔧 多种获取策略
1. **全局变量检测** - 从页面全局变量中获取 token
2. **网络请求拦截** - 监听网络请求中的 token
3. **主动生成** - 执行页面中的 token 生成逻辑
4. **备用方案** - 生成备用 token 确保服务可用

## 安装依赖

```bash
npm install puppeteer
```

## 使用方法

### 基础使用

```javascript
const { generateImage } = require('./guest/index')

// 生成单张图片
const result = await generateImage('一只可爱的小猫咪', '1:1')
console.log('生成结果:', result)
```

### 批量生成

```javascript
const { generateImagesBatch } = require('./guest/index')

const requests = [
  { prompt: '美丽的风景', size: '16:9' },
  { prompt: '可爱的动物', size: '1:1' }
]

const results = await generateImagesBatch(requests)
console.log('批量生成结果:', results)
```

### 资源清理

```javascript
const { cleanup, resetTokenCache } = require('./guest/index')

// 重置 token 缓存
resetTokenCache()

// 清理所有资源（关闭浏览器）
await cleanup()
```

## 配置说明

### guest-config.js
- `baseURL`: Qwen API 基础地址
- `defaultModel`: 默认使用的模型
- `supportedSizes`: 支持的图片尺寸
- `timeout`: 请求超时时间

### 环境变量
- `PUPPETEER_EXECUTABLE_PATH`: 自定义 Chrome 浏览器路径
- `PUPPETEER_HEADLESS`: 是否使用无头模式 (默认: true)

## 测试

```bash
# 测试 token 生成器
node guest/test-token.js

# 测试图像生成
node -e "require('./guest/index').generateImage('测试图片', '1:1').then(console.log)"
```

## 注意事项

1. **首次运行** - 首次使用时会下载 Chrome 浏览器，可能需要较长时间
2. **资源管理** - 建议在应用结束时调用 `cleanup()` 方法清理浏览器资源
3. **网络环境** - 需要能够访问 chat.qwen.ai
4. **系统要求** - 需要支持 Chrome 浏览器的系统环境

## 故障排除

### 浏览器启动失败
```bash
# 安装系统依赖 (Ubuntu/Debian)
sudo apt-get install -y gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
```

### Token 获取失败
- 检查网络连接
- 尝试重置缓存: `resetTokenCache()`
- 检查 Qwen 官网是否可访问

## 更新日志

### v2.0.0
- 重构为基于 Puppeteer 的真实浏览器环境
- 移除复杂的沙箱模拟逻辑
- 增加智能缓存机制
- 提供多种 token 获取策略
- 改善错误处理和日志记录
