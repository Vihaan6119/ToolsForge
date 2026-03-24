const http = require('http');

const testPorts = [3000, 3001, 3002];
let found = false;

function testPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}`, { timeout: 1000 }, (res) => {
      console.log(`✓ Server running on port ${port}`);
      found = true;
      resolve(true);
    });
    req.on('error', () => {
      resolve(false);
    });
  });
}

async function checkServers() {
  for (const port of testPorts) {
    if (await testPort(port)) {
      process.exit(0);
    }
  }
  console.log('✗ No available server found on ports 3000-3002');
  console.log('Dev server may still be starting. Try http://localhost:3001 or http://localhost:3000');
  process.exit(0);
}

checkServers();
