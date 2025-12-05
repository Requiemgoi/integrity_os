import { io } from 'socket.io-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8000';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.errorLogged = false;
    this.isConnecting = false;
    this.reconnectionDisabled = false;
    this.connectTimeout = null;
  }

  connect() {
    // Если уже подключен, не создаем новое соединение
    if (this.socket?.connected) {
      return;
    }

    // Если идет подключение, не создаем новое соединение
    if (this.isConnecting || (this.socket && this.socket.connecting)) {
      return;
    }

    // Если переподключение отключено из-за множественных ошибок, не пытаемся снова
    if (this.reconnectionDisabled) {
      return;
    }

    // Если есть старое соединение, которое не подключено, отключаем его
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    this.isConnecting = true;

    this.socket = io(WS_URL, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: this.maxReconnectAttempts,
      timeout: 10000,
      autoConnect: true,
      forceNew: false, // Переиспользуем соединение если возможно
    });

    // Обработчик успешного подключения
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.errorLogged = false;
      this.isConnecting = false;
      this.reconnectionDisabled = false;
      this.emit('connect');
      
      // Очищаем таймаут если был установлен
      if (this.connectTimeout) {
        clearTimeout(this.connectTimeout);
        this.connectTimeout = null;
      }
    });

    // Обработчик отключения
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnecting = false;
      this.emit('disconnect');
      
      // Если отключение было не по нашей инициативе и переподключение не отключено
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Socket.io автоматически попытается переподключиться
      }
    });

    // Обработчик ошибок подключения
    this.socket.on('connect_error', (error) => {
      this.isConnecting = false;
      this.reconnectAttempts++;
      
      // Логируем ошибку только один раз
      if (!this.errorLogged) {
        console.warn('WebSocket connection error. Backend may be offline.');
        this.errorLogged = true;
      }
      
      // Если превышено количество попыток, отключаем переподключение
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.warn(`WebSocket: Max reconnection attempts (${this.maxReconnectAttempts}) reached. Disabling automatic reconnection. Please check if backend is running.`);
        this.socket.io.reconnection(false);
        this.reconnectionDisabled = true;
        
        // Устанавливаем таймаут для повторной попытки через 30 секунд
        if (this.connectTimeout) {
          clearTimeout(this.connectTimeout);
        }
        this.connectTimeout = setTimeout(() => {
          this.reconnectionDisabled = false;
          this.reconnectAttempts = 0;
          console.log('WebSocket: Retrying connection after timeout...');
          this.connect();
        }, 30000);
      }
    });

    // Обработчик попыток переподключения
    this.socket.io.on('reconnect_attempt', (attemptNumber) => {
      // Логируем только каждую 10-ю попытку, чтобы не спамить
      if (attemptNumber % 10 === 0) {
        console.log(`WebSocket: Reconnection attempt ${attemptNumber}...`);
      }
    });

    // Обработчик успешного переподключения
    this.socket.io.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket: Reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
      this.errorLogged = false;
      this.reconnectionDisabled = false;
    });

    // Обработчик неудачного переподключения
    this.socket.io.on('reconnect_failed', () => {
      console.warn('WebSocket: Reconnection failed. Max attempts reached.');
      this.reconnectionDisabled = true;
    });

    // Обработчики данных
    this.socket.on('sensor_data', (data) => {
      this.emit('sensor_data', data);
    });

    this.socket.on('alert', (data) => {
      this.emit('alert', data);
    });

    this.socket.on('message', (data) => {
      console.log('WebSocket message:', data);
    });
  }

  disconnect() {
    // Очищаем таймаут если был установлен
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.reconnectAttempts = 0;
    this.errorLogged = false;
    this.isConnecting = false;
    this.reconnectionDisabled = false;
  }

  isConnected() {
    return this.socket?.connected === true;
  }

  subscribe(sensorType) {
    if (this.socket?.connected) {
      this.socket.emit('subscribe', { sensor_type: sensorType });
    } else {
      // Если не подключен, попробуем подписаться после подключения
      const onConnect = () => {
        if (this.socket?.connected) {
          this.socket.emit('subscribe', { sensor_type: sensorType });
        }
        this.off('connect', onConnect);
      };
      // Подписываемся только один раз на событие подключения
      this.on('connect', onConnect);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((callback) => {
        callback(data);
      });
    }
  }
}

export const websocketService = new WebSocketService();

