// 根据环境动态配置WebSocket URL
const getWebSocketURL = () => {
  if (process.env.NODE_ENV === 'production') {
    // 生产环境使用当前域名
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/elevator`;
  } else {
    // 开发环境使用localhost
    return 'ws://localhost:8080/ws/elevator';
  }
};

const WEBSOCKET_URL = getWebSocketURL();

class ElevatorSocketService {
  constructor() {
    this.socket = null;
    this.messageListener = null;
  }

  /**
   * 连接到WebSocket服务器
   * @param {string} elevatorId - 要订阅的智云梯ID
   * @param {function} onMessageCallback - 收到消息时的回调函数
   */
  connect(elevatorId, onMessageCallback) {
    // 防止重复连接
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.warn('WebSocket is already connected.');
      return;
    }

    const url = `${WEBSOCKET_URL}/status/${elevatorId}`;
    this.socket = new WebSocket(url);
    this.messageListener = onMessageCallback;

    this.socket.onopen = () => {
      console.log(`WebSocket connected to ${url}`);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (this.messageListener) {
          this.messageListener(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.socket.onclose = (event) => {
      console.log(`WebSocket disconnected from ${url}. Code: ${event.code}, Reason: ${event.reason}`);
      // 可选：在此处实现自动重连逻辑
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  /**
   * 发送通用指令到服务器
   * @param {object} commandPayload - 要发送的指令负载
   */
  sendCommand(commandPayload) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(commandPayload));
    } else {
      console.error('WebSocket is not connected. Cannot send command.');
    }
  }

  /**
   * 指示智云梯去往指定楼层
   * @param {string} elevatorId - 智云梯ID
   * @param {number} floor - 目标楼层
   */
  goToFloor(elevatorId, floor) {
    this.sendCommand({
      elevatorId,
      command: 'GOTO_FLOOR',
      floor: floor,
    });
  }

  /**
   * 切换智云梯门状态 (开/关)
   * @param {string} elevatorId - 智云梯ID
   */
  toggleDoor(elevatorId) {
    this.sendCommand({
      elevatorId,
      command: 'TOGGLE_DOOR',
    });
  }

  /**
   * 紧急停止智云梯
   * @param {string} elevatorId - 智云梯ID
   */
  emergencyStop(elevatorId) {
    this.sendCommand({
      elevatorId,
      command: 'EMERGENCY_STOP',
    });
  }

  /**
   * 恢复智云梯运行
   * @param {string} elevatorId - 智云梯ID
   */
  resumeOperation(elevatorId) {
    this.sendCommand({
      elevatorId,
      command: 'RESUME_OPERATION',
    });
  }


  /**
   * 发送消息到服务器
   * @param {any} data - 要发送的数据
   * @deprecated Use sendCommand or specific command methods instead.
   */
  sendMessage(data) {
    console.warn("sendMessage is deprecated. Use sendCommand or specific command methods like goToFloor instead.");
    this.sendCommand(data);
  }

  /**
   * 关闭WebSocket连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.messageListener = null;
    }
  }
}

// 导出一个单例，确保整个应用只有一个WebSocket服务实例
export default new ElevatorSocketService();