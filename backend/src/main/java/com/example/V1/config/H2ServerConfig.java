package com.example.V1.config;

import org.h2.tools.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Configuration
public class H2ServerConfig {

	private static final Logger logger = LoggerFactory.getLogger(H2ServerConfig.class);

	@Bean(initMethod = "start", destroyMethod = "stop")
	public Server h2TcpServer() throws java.sql.SQLException {
		try {
			// 启动 H2 TCP 服务，端口 9092，仅本机可连（不加 -tcpAllowOthers）
			Server server = Server.createTcpServer(
				"-tcp",
				"-ifNotExists",
				"-tcpPort", "9092"
			);
			logger.info("H2 TCP 服务器准备在端口 9092 启动");
			return server;
		} catch (Exception e) {
			logger.error("H2 TCP 服务器启动失败: {}", e.getMessage());
			// 如果端口被占用，尝试使用其他端口
			if (e.getMessage().contains("Address already in use")) {
				logger.warn("端口 9092 被占用，尝试使用端口 9093");
				try {
					Server fallbackServer = Server.createTcpServer(
						"-tcp",
						"-ifNotExists",
						"-tcpPort", "9093"
					);
					logger.info("H2 TCP 服务器准备在备用端口 9093 启动");
					return fallbackServer;
				} catch (Exception fallbackE) {
					logger.error("备用端口 9093 也启动失败: {}", fallbackE.getMessage());
					throw new RuntimeException("H2 TCP服务器启动失败，请检查端口占用情况", fallbackE);
				}
			}
			throw e;
		}
	}
} 