const http = require('http');
// 导入共享的headers配置
const headers = require('./headers');

// 生成随机数后缀
const randomSuffix = Date.now();

// 要修改的租户ID（需要根据实际情况替换）
const tenantId = 'cmoidmooq000216mrfb7pxh5c'; // 请替换为实际存在的租户ID

const options = {
  hostname: 'localhost',
  port: 3000,
  path: `/api/tenant/edit/${tenantId}`,
  method: 'PUT',
  headers: { ...headers }
};

// 测试修改数据
const requestData = JSON.stringify({
  "name": `修改后的租户名称_${randomSuffix}`,
  "productId": "1" // 试用版产品ID
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
      const response = JSON.parse(data);
      console.log('\n响应结果:');
      console.log(JSON.stringify(response, null, 2));
      
      if (response.success && response.tenant) {
        console.log('\n租户信息已成功更新:');
        console.log(`ID: ${response.tenant.id}`);
        console.log(`名称: ${response.tenant.name}`);
        console.log(`产品ID: ${response.tenant.productId}`);
        console.log(`产品名称: ${response.tenant.productName}`);
        console.log(`更新时间: ${new Date(response.tenant.updatedAt).toLocaleString()}`);
      }
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
