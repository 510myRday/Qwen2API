#!/usr/bin/env python3
"""
Qwen2API 测试脚本
使用 OpenAI Python 库测试本地 Qwen API 服务
"""

import openai
import sys
import os
from dotenv import load_dotenv

# 加载 .env 文件中的环境变量
load_dotenv()

# 从环境变量获取配置，如果没有则使用默认值
API_KEY = os.getenv("API_KEY", "sk-dev123456")
SERVICE_PORT = os.getenv("SERVICE_PORT", "3000")
BASE_URL = f"http://localhost:{SERVICE_PORT}/v1"
CLI_BASE_URL = f"http://localhost:{SERVICE_PORT}/cli/v1"  # CLI端点URL

# 配置 OpenAI 客户端指向本地服务
client = openai.OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL
)

# 配置 CLI 端点客户端（用于工具调用测试）
cli_client = openai.OpenAI(
    api_key=API_KEY,
    base_url=CLI_BASE_URL
)

def test_models():
    """测试获取模型列表"""
    print("=" * 50)
    print("🔍 测试获取模型列表...")
    try:
        models = client.models.list()
        print(f"✅ 成功获取到 {len(models.data)} 个模型：")
        for model in models.data:
            print(f"   - {model.id}")
        return True
    except Exception as e:
        print(f"❌ 获取模型列表失败: {e}")
        return False

def test_chat():
    """测试聊天对话"""
    print("=" * 50)
    print("💬 测试聊天对话...")
    try:
        response = client.chat.completions.create(
            model="qwen3-max",
            messages=[
                {"role": "user", "content": "你好，请用一句话介绍一下自己"}
            ],
            max_tokens=100
        )
        content = response.choices[0].message.content
        print(f"✅ AI回复: {content}")
        print(f"📊 Token使用: {response.usage.total_tokens}")
        return True
    except Exception as e:
        print(f"❌ 聊天对话失败: {e}")
        return False

def test_stream():
    """测试流式响应"""
    print("=" * 50)
    print("🌊 测试流式响应...")
    try:
        stream = client.chat.completions.create(
            model="qwen3-max",
            messages=[
                {"role": "user", "content": "请写一首关于春天的短诗，不超过4行"}
            ],
            stream=True,
            max_tokens=100
        )
        print("✅ 流式回复:")
        content = ""
        for chunk in stream:
            # 安全检查：确保 choices 列表不为空且包含 delta
            if (hasattr(chunk, 'choices') and
                len(chunk.choices) > 0 and
                hasattr(chunk.choices[0], 'delta') and
                hasattr(chunk.choices[0].delta, 'content') and
                chunk.choices[0].delta.content):
                content += chunk.choices[0].delta.content
                print(chunk.choices[0].delta.content, end="", flush=True)
        print("\n")
        if content.strip():
            return True
        else:
            print("⚠️ 流式响应为空")
            return False
    except Exception as e:
        print(f"❌ 流式响应失败: {e}")
        return False

def test_thinking_model():
    """测试思考模式（流式输出）"""
    print("=" * 50)
    print("🧠 测试思考模式（流式输出）...")
    try:
        stream = client.chat.completions.create(
            model="qwen3-max-thinking",
            messages=[
                {"role": "user", "content": "计算 23 + 45 = ?，请详细展示你的思考过程"}
            ],
            stream=True,
            max_tokens=500
        )
        print("✅ 思考模式流式回复:")
        content = ""
        for chunk in stream:
            # 安全检查：确保 choices 列表不为空且包含 delta
            if (hasattr(chunk, 'choices') and
                len(chunk.choices) > 0 and
                hasattr(chunk.choices[0], 'delta') and
                hasattr(chunk.choices[0].delta, 'content') and
                chunk.choices[0].delta.content):
                content += chunk.choices[0].delta.content
                print(chunk.choices[0].delta.content, end="", flush=True)
        print("\n")
        if content.strip():
            return True
        else:
            print("⚠️ 思考模式流式响应为空")
            return False
    except Exception as e:
        print(f"❌ 思考模式失败: {e}")
        return False

def test_tool_calling():
    """测试工具调用功能（仅在CLI端点支持）"""
    print("=" * 50)
    print("🔧 测试工具调用功能...")
    try:
        # 定义工具
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_current_weather",
                    "description": "获取指定城市的当前天气信息",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "city": {
                                "type": "string",
                                "description": "城市名称，例如：北京、上海"
                            }
                        },
                        "required": ["city"]
                    }
                }
            }
        ]
        
        # 发送带有工具的请求
        response = cli_client.chat.completions.create(
            model="qwen3-coder-plus",  # CLI端点支持的模型
            messages=[
                {"role": "user", "content": "今天北京的天气怎么样？"}
            ],
            tools=tools,
            tool_choice="auto",  # 自动选择工具
            max_tokens=500
        )
        
        # 输出响应
        print("✅ 工具调用响应:")
        print(f"完成原因: {response.choices[0].finish_reason}")
        
        # 检查是否有工具调用
        if response.choices[0].finish_reason == "tool_calls":
            tool_calls = response.choices[0].message.tool_calls
            print(f"工具调用数量: {len(tool_calls)}")
            for i, tool_call in enumerate(tool_calls):
                print(f"工具调用 {i+1}:")
                print(f"  工具名称: {tool_call.function.name}")
                print(f"  工具参数: {tool_call.function.arguments}")
        else:
            # 普通回复
            content = response.choices[0].message.content
            print(f"AI回复: {content}")
            
        print(f"📊 Token使用: {response.usage.total_tokens}")
        return True
    except Exception as e:
        print(f"❌ 工具调用测试失败: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始测试 Qwen2API 服务...")
    print(f"📡 服务地址: {BASE_URL}")
    print(f"🔧 CLI端点地址: {CLI_BASE_URL}")
    print(f"🔑 API密钥: {API_KEY}")

    # 检查配置来源
    if API_KEY == "sk-dev123456":
        print("💡 提示: 使用默认API密钥，可在 .env 文件中修改 API_KEY")
    else:
        print("✅ 从 .env 文件读取API密钥")

    if SERVICE_PORT == "3000":
        print("💡 提示: 使用默认端口，可在 .env 文件中修改 SERVICE_PORT")
    else:
        print(f"✅ 从 .env 文件读取端口: {SERVICE_PORT}")
    
    # 运行所有测试
    tests = [
        ("模型列表", test_models),
        ("聊天对话", test_chat),
        ("流式响应", test_stream),
        ("思考模式（流式）", test_thinking_model),
        ("工具调用", test_tool_calling)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except KeyboardInterrupt:
            print("\n⚠️ 测试被用户中断")
            break
        except Exception as e:
            print(f"❌ {test_name} 测试出现异常: {e}")
            results.append((test_name, False))
    
    # 输出测试结果汇总
    print("=" * 50)
    print("📋 测试结果汇总:")
    passed = 0
    for test_name, result in results:
        status = "✅ 通过" if result else "❌ 失败"
        print(f"   {test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\n🎯 总计: {passed}/{len(results)} 个测试通过")
    
    if passed == len(results):
        print("🎉 所有测试通过！您的 API 服务运行正常。")
        return 0
    else:
        print("⚠️ 部分测试失败，请检查服务配置。")
        return 1

if __name__ == "__main__":
    sys.exit(main())