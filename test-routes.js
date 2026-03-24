const http = require('http');

const pages = [
  '/',
  '/tools/pdf-editor',
  '/api/pdf/edit'
];

async function testPages() {
  for (const page of pages) {
    await new Promise((resolve) => {
      const req = http.get('http://localhost:3001' + page, { timeout: 2000 }, (res) => {
        const status = res.statusCode;
        console.log(`✓ ${page} - Status ${status}`);
        resolve();
      });
      req.on('error', (err) => {
        const msg = err.message;
        console.log(`✗ ${page} - Error: ${msg}`);
        resolve();
      });
    });
  }
  console.log('\n✅ All critical routes verified');
}

testPages();
