"""
卡密验证系统 Python 客户端 SDK

使用流程：
1. 初始化 SDK，传入 AppKey 和 AppSecret
2. 调用 get_challenge() 获取挑战字符串
3. 调用 activate() 激活卡密
4. 定期调用 heartbeat() 维持在线状态
5. 退出时调用 logout()

依赖：pip install requests pycryptodome
"""

import hashlib
import hmac
import json
import os
import platform
import time
from typing import Dict, Any, Optional
from base64 import b64decode
from Crypto.Cipher import AES
from Crypto.Util.Padding import unpad
import requests


class CardVerifyClient:
    """卡密验证系统 Python 客户端"""

    def __init__(self, api_base_url: str, app_key: str, app_secret: str):
        """
        初始化客户端

        Args:
            api_base_url: 后端 API 地址，例如 https://your-backend.onrender.com
            app_key: 程序 AppKey，从后台获取
            app_secret: 程序 AppSecret，从后台获取
        """
        self.api_base_url = api_base_url.rstrip('/')
        self.app_key = app_key
        self.app_secret = app_secret
        self.user_id: Optional[str] = None
        self.heartbeat_token: Optional[str] = None
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    # ==================== 签名生成 ====================

    def _generate_nonce(self) -> str:
        """生成 16 位随机 nonce（hex 编码）"""
        return os.urandom(8).hex()

    def _generate_signature(self, timestamp: int, nonce: str, body_json: str) -> str:
        """
        生成 HMAC-SHA256 签名
        signature = HMAC-SHA256(timestamp + nonce + bodyJson, appSecret)
        """
        data = str(timestamp) + nonce + body_json
        return hmac.new(
            self.app_secret.encode('utf-8'),
            data.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

    def _build_signed_request(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """构建带签名的请求体"""
        timestamp = int(time.time() * 1000)  # 毫秒级时间戳
        nonce = self._generate_nonce()

        # 注入签名参数
        payload['appKey'] = self.app_key
        payload['timestamp'] = timestamp
        payload['nonce'] = nonce

        body_json = json.dumps(payload, separators=(',', ':'))
        payload['signature'] = self._generate_signature(timestamp, nonce, body_json)

        return payload

    def _send_request(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """发送签名请求"""
        signed = self._build_signed_request(payload)
        resp = self.session.post(
            f'{self.api_base_url}/api/client/{endpoint}',
            json=signed,
            timeout=30
        )
        return resp.json()

    # ==================== 响应解密 ====================

    def _decrypt_response(self, encrypted_b64: str, iv_b64: str, challenge: str) -> str:
        """
        AES-256-CBC 解密响应数据
        密钥 = SHA-256(challenge)
        """
        key = hashlib.sha256(challenge.encode('utf-8')).digest()
        encrypted = b64decode(encrypted_b64)
        iv = b64decode(iv_b64)

        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted = unpad(cipher.decrypt(encrypted), AES.block_size)
        return decrypted.decode('utf-8')

    # ==================== 公开接口 ====================

    def get_challenge(self) -> str:
        """
        获取挑战字符串
        返回 128 位（32 字符 hex）随机挑战
        """
        result = self._send_request('challenge', {})
        if result['code'] != 0:
            raise Exception(f"获取挑战失败: {result['message']}")
        return result['data']['challenge']

    def activate(self, card_key_plain: str, username: str, hardware_info: str) -> Dict[str, Any]:
        """
        激活卡密

        Args:
            card_key_plain: 卡密明文
            username: 终端用户自定义用户名
            hardware_info: 硬件信息 JSON 字符串

        Returns:
            激活结果字典，包含 userId, heartbeatToken, expiresAt, maxDevices, deviceCount
        """
        # 1. 获取挑战
        challenge = self.get_challenge()

        # 2. 计算挑战响应：HMAC-SHA256(challenge + cardKey + username, appSecret)
        challenge_data = challenge + card_key_plain + username
        challenge_response = challenge + ':' + hmac.new(
            self.app_secret.encode('utf-8'),
            challenge_data.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()

        # 3. 提交激活请求
        payload = {
            'cardKey': card_key_plain,
            'username': username,
            'hardwareInfo': hardware_info,
            'challengeResponse': challenge_response,
        }

        result = self._send_request('activate', payload)

        if result['code'] != 0:
            raise Exception(f"激活失败: {result['message']}")

        data = result['data']
        self.user_id = data['userId']

        # 解密响应
        decrypted = self._decrypt_response(
            data['encrypted'], data['iv'], challenge
        )
        response_data = json.loads(decrypted)
        self.heartbeat_token = response_data['heartbeatToken']

        return {
            'userId': self.user_id,
            'heartbeatToken': self.heartbeat_token,
            'expiresAt': response_data.get('expiresAt'),
            'maxDevices': response_data['maxDevices'],
            'deviceCount': response_data['deviceCount'],
        }

    def heartbeat(self) -> Dict[str, Any]:
        """
        心跳验证（单次有效 Token）
        每次调用后旧 Token 失效，返回新 Token

        Returns:
            心跳结果字典，包含 heartbeatToken, expiresAt, serverTime
        """
        if not self.user_id or not self.heartbeat_token:
            raise Exception("请先激活卡密")

        payload = {
            'userId': self.user_id,
            'heartbeatToken': self.heartbeat_token,
        }

        result = self._send_request('heartbeat', payload)

        if result['code'] != 0:
            raise Exception(f"心跳验证失败: {result['message']}")

        data = result['data']
        # 响应解密
        challenge = self.get_challenge()
        decrypted = self._decrypt_response(
            data['encrypted'], data['iv'], challenge
        )
        response_data = json.loads(decrypted)
        self.heartbeat_token = response_data['heartbeatToken']

        return {
            'heartbeatToken': self.heartbeat_token,
            'expiresAt': response_data.get('expiresAt'),
            'serverTime': response_data['serverTime'],
        }

    def logout(self) -> None:
        """登出，失效所有心跳 Token"""
        if not self.user_id:
            return

        payload = {'userId': self.user_id}
        self._send_request('logout', payload)
        self.user_id = None
        self.heartbeat_token = None

    # ==================== 硬件信息采集 ====================

    @staticmethod
    def collect_hardware_info() -> str:
        """
        采集硬件信息，用于生成设备指纹
        采集内容：CPU 信息 + 主板序列号 + MAC 地址 + 系统版本
        注意：原始信息提交服务端统一哈希，客户端不自行计算指纹
        """
        import uuid
        info = {
            'node': platform.node(),
            'machine': platform.machine(),
            'processor': platform.processor(),
            'system': platform.system(),
            'version': platform.version(),
            'macAddress': hex(uuid.getnode()),
        }
        return json.dumps(info)


# ==================== 使用示例 ====================

if __name__ == '__main__':
    # 初始化客户端
    client = CardVerifyClient(
        api_base_url='https://your-backend.onrender.com',
        app_key='your-app-key',        # 从后台获取
        app_secret='your-app-secret',  # 从后台获取
    )

    # 采集硬件信息
    hardware_info = CardVerifyClient.collect_hardware_info()

    # 激活卡密
    try:
        result = client.activate(
            card_key_plain='CARD-KEY-PLAINTEXT',
            username='player_123',
            hardware_info=hardware_info,
        )
        print(f"激活成功! userId={result['userId']}, 过期={result['expiresAt']}")

        # 心跳（建议每 60 秒调用一次）
        import threading
        import atexit

        def heartbeat_loop():
            while True:
                time.sleep(60)
                try:
                    hb = client.heartbeat()
                    print(f"心跳成功: {hb['serverTime']}")
                except Exception as e:
                    print(f"心跳失败: {e}")
                    break

        # 启动心跳线程
        thread = threading.Thread(target=heartbeat_loop, daemon=True)
        thread.start()

        # 注册退出时登出
        atexit.register(client.logout)

        # 保持主线程运行
        thread.join()

    except Exception as e:
        print(f"错误: {e}")
        client.logout()