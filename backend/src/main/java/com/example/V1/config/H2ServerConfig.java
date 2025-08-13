package com.example.V1.config;

import org.h2.tools.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class H2ServerConfig {

	@Bean(initMethod = "start", destroyMethod = "stop")
	public Server h2TcpServer() throws java.sql.SQLException {
		// 启动 H2 TCP 服务，端口 9092，仅本机可连（不加 -tcpAllowOthers）
		return Server.createTcpServer(
			"-tcp",
			"-ifNotExists",
			"-tcpPort", "9092"
		);
	}
} 