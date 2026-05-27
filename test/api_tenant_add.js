const http = require('http');
// 导入共享的headers配置
const headers = require('./headers');

// 生成随机数后缀
const randomSuffix = Date.now();

// 生成随机手机号（11位，以138开头）
const randomPhone = `138${Math.floor(10000000 + Math.random() * 90000000)}`;

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/tenant/add',
  method: 'POST',
  headers: { ...headers }
};

const requestData = JSON.stringify({
  "name": `测试租户_${randomSuffix}`,
  "productId": "1",
  "userName": `测试用户_${randomSuffix}`,
  "userEmail": `test_${randomSuffix}@example.com`,
  "userPhone": randomPhone,
  "userPassword": "12345678"
});

// 设置Content-Length头
options.headers['Content-Length'] = Buffer.byteLength(requestData);

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log('Headers:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const jsonData = JSON.parse(data);
      console.log('Response:', jsonData);
    } catch (error) {
      console.error('Error parsing JSON:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
});

// 发送请求体
req.write(requestData);
req.end();
