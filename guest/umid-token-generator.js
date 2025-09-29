const https = require('https');

/**
 * 获取UMID token的完整脚本
 * 支持从两个URL获取token并解析
 */

class UmidTokenGenerator {
    constructor() {
        this.urls = [
            'https://sg-wum.alibaba.com/w/wu.json',
            'https://ynuf.aliapp.org/w/wu.json',

        ];
    }

    /**
     * 从响应文本中提取token
     * @param {string} responseText - 响应文本
     * @returns {string|null} 提取到的token或null
     */
    extractToken(responseText) {
        // 正则表达式匹配两种格式的token
        const patterns = [
            /umx\.wu\('([^']+)'\)/,  // 匹配 umx.wu('token')
            /__fycb\('([^']+)'\)/     // 匹配 __fycb('token')
        ];

        for (const pattern of patterns) {
            const match = responseText.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    /**
     * 发起HTTP GET请求
     * @param {string} url - 请求URL
     * @returns {Promise<string>} 响应文本
     */
    httpGet(url) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            
            const options = {
                hostname: urlObj.hostname,
                path: urlObj.pathname + urlObj.search,
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive',
                    'Referer': 'https://www.alibaba.com/',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'same-site'
                },
                timeout: 5000 // 5秒超时
            };

            const req = https.request(options, (response) => {
                let data = '';

                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    if (response.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('请求超时'));
            });

            req.end();
        });
    }

    /**
     * 从指定URL获取token
     * @param {string} url - 请求URL
     * @returns {Promise<string>} token
     */
    async getTokenFromUrl(url) {
        try {
            console.log(`正在从 ${url} 获取token...`);
            const responseText = await this.httpGet(url);
            const token = this.extractToken(responseText);

            if (token) {
                console.log(`成功获取token: ${token}`);
                return token;
            } else {
                throw new Error('无法从响应中提取token');
            }
        } catch (error) {
            throw new Error(`从 ${url} 获取token失败: ${error.message}`);
        }
    }

    /**
     * 生成UMID token（主函数）
     * @returns {Promise<string>} UMID token
     */
    async generateUmidToken() {
        // 尝试从所有可用URL获取token
        for (const url of this.urls) {
            try {
                const token = await this.getTokenFromUrl(url);
                return token;
            } catch (error) {
                console.warn(error.message);
                // 继续尝试下一个URL
            }
        }

        throw new Error('所有URL都尝试失败，无法获取token');
    }

}

// 创建实例
const umidGenerator = new UmidTokenGenerator();

// 导出函数（只保留异步版本）
module.exports = { 
    generateUmidToken: umidGenerator.generateUmidToken.bind(umidGenerator),
    UmidTokenGenerator
};

// 如果直接运行此文件，则执行测试
if (require.main === module) {
    (async () => {
        try {
            console.log('开始测试UMID token获取...');
            const token = await umidGenerator.generateUmidToken();
            console.log('测试成功！获取到的token:', token);
        } catch (error) {
            console.error('测试失败:', error.message);
            console.log('所有URL都尝试失败，无法获取token');
        }
    })();
}
