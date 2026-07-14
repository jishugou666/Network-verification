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
        采集硬件信息，用于生成设备指纹（Tencent ACE 风格全量采集）
        采集内容：CPU 序列号/核心数/名称、主板序列号/制造商、
        BIOS UUID/版本/序列号、硬盘序列号/型号、所有 MAC 地址、
        内存总量、OS 名称/版本/构建号/安装日期、机器名/架构
        注意：原始信息提交服务端统一哈希，客户端不自行计算指纹
        """
        import uuid
        info = {}

        # ==================== CPU 信息 ====================
        info['cpuName'] = platform.processor()
        info['cpuCoresPhysical'] = os.cpu_count()
        info['cpuArch'] = platform.machine()
        try:
            if sys.platform == 'win32':
                out = subprocess.check_output('wmic cpu get ProcessorId', shell=True).decode()
                m = re.search(r'[A-Fa-f0-9]{16}', out)
                info['cpuSerial'] = m.group(0) if m else ''
                out2 = subprocess.check_output('wmic cpu get NumberOfCores', shell=True).decode()
                cores = re.findall(r'\d+', out2)
                info['cpuCores'] = int(cores[1]) if len(cores) > 1 else os.cpu_count() or 0
            elif sys.platform == 'linux':
                try:
                    info['cpuSerial'] = subprocess.check_output(
                        "cat /proc/cpuinfo | grep Serial | awk '{print $3}'", shell=True).decode().strip()
                except:
                    info['cpuSerial'] = ''
                try:
                    info['cpuName'] = subprocess.check_output(
                        "cat /proc/cpuinfo | grep 'model name' | head -1 | cut -d':' -f2", shell=True).decode().strip()
                except:
                    pass
            elif sys.platform == 'darwin':
                info['cpuSerial'] = subprocess.check_output(
                    'sysctl -n machdep.cpu.brand_string', shell=True).decode().strip()
                info['cpuName'] = info['cpuSerial']
        except:
            info['cpuSerial'] = ''

        # ==================== 主板信息 ====================
        try:
            if sys.platform == 'win32':
                out = subprocess.check_output('wmic baseboard get SerialNumber', shell=True).decode()
                lines = [l.strip() for l in out.strip().split('\n') if l.strip()]
                info['mbSerial'] = lines[1] if len(lines) > 1 else ''
                mfg = subprocess.check_output('wmic baseboard get Manufacturer', shell=True).decode()
                mfg_lines = [l.strip() for l in mfg.strip().split('\n') if l.strip()]
                info['mbManufacturer'] = mfg_lines[1] if len(mfg_lines) > 1 else ''
                prod = subprocess.check_output('wmic baseboard get Product', shell=True).decode()
                prod_lines = [l.strip() for l in prod.strip().split('\n') if l.strip()]
                info['mbProduct'] = prod_lines[1] if len(prod_lines) > 1 else ''
            elif sys.platform == 'linux':
                info['mbSerial'] = subprocess.check_output(
                    'cat /sys/class/dmi/id/board_serial 2>/dev/null', shell=True).decode().strip()
                info['mbManufacturer'] = subprocess.check_output(
                    'cat /sys/class/dmi/id/board_vendor 2>/dev/null', shell=True).decode().strip()
                info['mbProduct'] = subprocess.check_output(
                    'cat /sys/class/dmi/id/board_name 2>/dev/null', shell=True).decode().strip()
        except:
            pass

        # ==================== BIOS 信息 ====================
        try:
            if sys.platform == 'win32':
                info['biosUuid'] = subprocess.check_output(
                    'wmic csproduct get UUID', shell=True).decode().split('\n')[1].strip()
                info['biosVersion'] = subprocess.check_output(
                    'wmic bios get SMBIOSBIOSVersion', shell=True).decode().split('\n')[1].strip()
                bios_serial = subprocess.check_output(
                    'wmic bios get SerialNumber', shell=True).decode()
                bios_lines = [l.strip() for l in bios_serial.strip().split('\n') if l.strip()]
                info['biosSerial'] = bios_lines[1] if len(bios_lines) > 1 else ''
            elif sys.platform == 'linux':
                info['biosUuid'] = subprocess.check_output(
                    'cat /sys/class/dmi/id/product_uuid 2>/dev/null', shell=True).decode().strip()
                info['biosVersion'] = subprocess.check_output(
                    'cat /sys/class/dmi/id/bios_version 2>/dev/null', shell=True).decode().strip()
                info['biosSerial'] = subprocess.check_output(
                    'cat /sys/class/dmi/id/bios_date 2>/dev/null', shell=True).decode().strip()
        except:
            pass

        # ==================== 硬盘信息 ====================
        try:
            if sys.platform == 'win32':
                disks = subprocess.check_output(
                    'wmic diskdrive get SerialNumber,Model,Size', shell=True).decode().strip()
                disk_lines = [l.strip() for l in disks.split('\n') if l.strip() and 'SerialNumber' not in l]
                disk_serials = []
                disk_models = []
                for dl in disk_lines:
                    parts = dl.split()
                    if len(parts) >= 2:
                        disk_serials.append(parts[-1])
                        disk_models.append(' '.join(parts[:-1]))
                info['diskSerial'] = disk_serials[0] if disk_serials else ''
                info['diskModel'] = disk_models[0] if disk_models else ''
                info['allDiskSerials'] = disk_serials
            elif sys.platform == 'linux':
                info['diskSerial'] = subprocess.check_output(
                    'lsblk -o SERIAL -nd 2>/dev/null | head -1', shell=True).decode().strip()
                info['diskModel'] = subprocess.check_output(
                    'lsblk -o MODEL -nd 2>/dev/null | head -1', shell=True).decode().strip()
                all_serials = subprocess.check_output(
                    'lsblk -o SERIAL -nd 2>/dev/null', shell=True).decode().strip().split('\n')
                info['allDiskSerials'] = [s.strip() for s in all_serials if s.strip()]
            elif sys.platform == 'darwin':
                info['diskSerial'] = subprocess.check_output(
                    "system_profiler SPSerialATADataType 2>/dev/null | grep 'Serial Number' | head -1 | awk '{print $NF}'",
                    shell=True).decode().strip()
        except:
            pass

        # ==================== 网络 MAC 地址 ====================
        try:
            macs = []
            if sys.platform == 'linux':
                # 从 /sys/class/net 读取所有网络接口 MAC
                net_dir = '/sys/class/net'
                if os.path.exists(net_dir):
                    for iface in os.listdir(net_dir):
                        addr_file = os.path.join(net_dir, iface, 'address')
                        if os.path.exists(addr_file):
                            with open(addr_file) as f:
                                mac = f.read().strip()
                                if mac and mac != '00:00:00:00:00:00':
                                    macs.append(mac)
            elif sys.platform == 'win32':
                out = subprocess.check_output(
                    'wmic nic where "PhysicalAdapter=True" get MACAddress', shell=True).decode()
                for line in out.strip().split('\n'):
                    line = line.strip()
                    if line and 'MACAddress' not in line and ':' in line:
                        macs.append(line.lower())
            elif sys.platform == 'darwin':
                out = subprocess.check_output(
                    "ifconfig | grep ether | awk '{print $2}'", shell=True).decode()
                for line in out.strip().split('\n'):
                    if line.strip():
                        macs.append(line.strip().lower())

            if not macs:
                # 回退：使用 uuid.getnode()
                node = uuid.getnode()
                macs.append(':'.join([f'{(node >> (i * 8)) & 0xff:02x}' for i in range(5, -1, -1)]))
            info['macAddresses'] = macs
        except:
            info['macAddresses'] = [hex(uuid.getnode())]

        # ==================== 内存信息 ====================
        try:
            if sys.platform == 'win32':
                import ctypes
                kernel32 = ctypes.windll.kernel32
                class MEMORYSTATUSEX(ctypes.Structure):
                    _fields_ = [
                        ('dwLength', ctypes.c_ulong),
                        ('dwMemoryLoad', ctypes.c_ulong),
                        ('ullTotalPhys', ctypes.c_ulonglong),
                        ('ullAvailPhys', ctypes.c_ulonglong),
                        ('ullTotalPageFile', ctypes.c_ulonglong),
                        ('ullAvailPageFile', ctypes.c_ulonglong),
                        ('ullTotalVirtual', ctypes.c_ulonglong),
                        ('ullAvailVirtual', ctypes.c_ulonglong),
                        ('ullAvailExtendedVirtual', ctypes.c_ulonglong),
                    ]
                mem_status = MEMORYSTATUSEX()
                mem_status.dwLength = ctypes.sizeof(MEMORYSTATUSEX)
                kernel32.GlobalMemoryStatusEx(ctypes.byref(mem_status))
                info['totalMemory'] = mem_status.ullTotalPhys
            elif sys.platform == 'linux':
                with open('/proc/meminfo') as f:
                    content = f.read()
                    m = re.search(r'MemTotal:\s+(\d+)', content)
                    info['totalMemory'] = int(m.group(1)) * 1024 if m else 0
            elif sys.platform == 'darwin':
                info['totalMemory'] = int(subprocess.check_output(
                    'sysctl -n hw.memsize', shell=True).decode().strip())
        except:
            info['totalMemory'] = 0

        # ==================== 操作系统信息 ====================
        info['osName'] = platform.system()
        info['osVersion'] = platform.version()
        info['osRelease'] = platform.release()
        if sys.platform == 'win32':
            info['osBuild'] = platform.win32_ver()[1]
            try:
                info['osInstallDate'] = subprocess.check_output(
                    'wmic os get InstallDate', shell=True).decode().split('\n')[1].strip()[:14]
            except:
                info['osInstallDate'] = ''
        elif sys.platform == 'linux':
            try:
                info['osBuild'] = subprocess.check_output(
                    'uname -r', shell=True).decode().strip()
            except:
                info['osBuild'] = ''
        elif sys.platform == 'darwin':
            try:
                info['osBuild'] = subprocess.check_output(
                    'sw_vers -buildVersion', shell=True).decode().strip()
            except:
                info['osBuild'] = ''

        # ==================== 机器信息 ====================
        info['hostname'] = socket.gethostname()
        info['machineArch'] = platform.machine()

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