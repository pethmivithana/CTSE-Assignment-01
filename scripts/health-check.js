#!/usr/bin/env node

/**
 * Feedo Health Check Tool
 * Diagnoses all services and their connectivity
 * Run: npm run health-check or node scripts/health-check.js
 */

const http = require('http');
const net = require('net');

const RESET = '\x1b[0m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const CYAN = '\x1b[36m';

// Services configuration
const SERVICES = {
  'MongoDB': { host: 'localhost', port: 27017, type: 'socket' },
  'API Gateway': { host: 'localhost', port: 3001, type: 'http', path: '/health' },
  'User Service': { host: 'localhost', port: 5002, type: 'http', path: '/health' },
  'Restaurant Service': { host: 'localhost', port: 3002, type: 'http', path: '/health' },
  'Order Service': { host: 'localhost', port: 3004, type: 'http', path: '/health' },
  'Delivery Service': { host: 'localhost', port: 3003, type: 'http', path: '/health' },
  'Notification Service': { host: 'localhost', port: 3005, type: 'http', path: '/health' },
  'Payment Service': { host: 'localhost', port: 3006, type: 'http', path: '/health' },
  'Frontend': { host: 'localhost', port: 3000, type: 'http', path: '/' },
};

// Docker container names mapping
const DOCKER_CONTAINERS = {
  'MongoDB': 'feedo-mongodb',
  'API Gateway': 'feedo-api-gateway',
  'User Service': 'feedo-user-service',
  'Restaurant Service': 'feedo-restaurant-service',
  'Order Service': 'feedo-order-service',
  'Delivery Service': 'feedo-delivery-service',
  'Notification Service': 'feedo-notification-service',
  'Payment Service': 'feedo-payment-service',
  'Frontend': 'feedo-frontend',
};

/**
 * Check if a socket can connect to a port
 */
function checkSocket(host, port) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, 2000);

    socket.connect(port, host, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });
}

/**
 * Check if an HTTP endpoint is accessible
 */
function checkHttp(host, port, path = '/') {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: path,
      method: 'GET',
      timeout: 2000,
    };

    const req = http.request(options, (res) => {
      resolve(res.statusCode < 500);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Main health check function
 */
async function runHealthCheck() {
  console.clear();
  console.log(`${CYAN}╔══════════════════════════════════════════╗${RESET}`);
  console.log(`${CYAN}║       FEEDO MICROSERVICES HEALTH CHECK    ║${RESET}`);
  console.log(`${CYAN}╚══════════════════════════════════════════╝${RESET}`);
  console.log('');

  const results = {};
  let allHealthy = true;

  console.log(`${BLUE}Checking services...${RESET}\n`);

  for (const [serviceName, config] of Object.entries(SERVICES)) {
    process.stdout.write(`  ${serviceName.padEnd(25)} ... `);

    let isHealthy = false;
    if (config.type === 'socket') {
      isHealthy = await checkSocket(config.host, config.port);
    } else if (config.type === 'http') {
      isHealthy = await checkHttp(config.host, config.port, config.path);
    }

    results[serviceName] = isHealthy;
    if (!isHealthy) allHealthy = false;

    const status = isHealthy ? `${GREEN}✓ Online${RESET}` : `${RED}✗ Offline${RESET}`;
    const port = ` (port ${config.port})`;
    console.log(`${status}${port}`);
  }

  console.log('');

  // Show detailed status
  console.log(`${BLUE}═══════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}Detailed Status:${RESET}\n`);

  const RUNNING_SERVICES = Object.entries(results)
    .filter(([_, status]) => status)
    .map(([name, _]) => name);

  const OFFLINE_SERVICES = Object.entries(results)
    .filter(([_, status]) => !status)
    .map(([name, _]) => name);

  if (RUNNING_SERVICES.length > 0) {
    console.log(`${GREEN}Running Services (${RUNNING_SERVICES.length}):${RESET}`);
    RUNNING_SERVICES.forEach(service => {
      console.log(`  ${GREEN}✓${RESET} ${service}`);
    });
  }

  if (OFFLINE_SERVICES.length > 0) {
    console.log(`\n${RED}Offline Services (${OFFLINE_SERVICES.length}):${RESET}`);
    OFFLINE_SERVICES.forEach(service => {
      console.log(`  ${RED}✗${RESET} ${service}`);
    });
  }

  console.log('');
  console.log(`${BLUE}═══════════════════════════════════════════${RESET}`);
  console.log(`${BLUE}Summary:${RESET}\n`);

  if (allHealthy) {
    console.log(`${GREEN}✓ All services are healthy!${RESET}\n`);
    console.log(`${CYAN}Ready for:${RESET}`);
    console.log(`  • User registration and login`);
    console.log(`  • Viewing restaurants`);
    console.log(`  • Placing orders`);
    console.log(`  • Making payments`);
    console.log(`  • Tracking deliveries\n`);
  } else {
    console.log(`${RED}✗ Some services are offline${RESET}\n`);
    console.log(`${YELLOW}To start all services:${RESET}`);
    console.log(`  • With Docker: ${CYAN}docker compose up -d${RESET}`);
    console.log(`  • Locally: Run services individually in separate terminals\n`);

    if (OFFLINE_SERVICES.length > 0) {
      console.log(`${YELLOW}Services to start:${RESET}`);
      OFFLINE_SERVICES.forEach(service => {
        const container = DOCKER_CONTAINERS[service];
        console.log(`  • ${service}`);
        if (container) {
          console.log(`    ${CYAN}docker start ${container}${RESET}`);
        }
      });
      console.log('');
    }
  }

  console.log(`${BLUE}═══════════════════════════════════════════${RESET}`);
  console.log(`\n${CYAN}Tips:${RESET}`);
  console.log(`  • Check logs: ${CYAN}docker logs feedo-api-gateway${RESET}`);
  console.log(`  • View all containers: ${CYAN}docker ps -a${RESET}`);
  console.log(`  • Run Docker setup: ${CYAN}docker compose up -d${RESET}`);
  console.log(`  • Re-run health check: ${CYAN}npm run health-check${RESET}\n`);

  process.exit(allHealthy ? 0 : 1);
}

// Handle interruption
process.on('SIGINT', () => {
  console.log(`\n${YELLOW}Health check interrupted${RESET}`);
  process.exit(1);
});

// Run the check
runHealthCheck().catch((err) => {
  console.error(`${RED}Error:${RESET}`, err.message);
  process.exit(1);
});
