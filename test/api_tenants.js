const http = require('http');
// 导入共享的headers配置
const headers = require('./headers');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/tenants',
  method: 'POST',
  headers: { ...headers }
};

// 测试查询参数（可以根据需要修改）
const requestData = JSON.stringify({
  // tenantId: "1", // 可选参数，指定租户ID
  // tenantName: "测试" // 可选参数，模糊搜索租户名称
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
      const tenants = JSON.parse(data).data;
      console.log('\n租户列表:');
      console.log(`共找到 ${tenants.length} 个租户`);
      console.log('='.repeat(80));
      
      tenants.forEach((tenant, index) => {
        console.log(`\n租户 ${index + 1}:`);
        console.log(`ID: ${tenant.id}`);
        console.log(`名称: ${tenant.name}`);
        console.log(`产品名称: ${tenant.productName}`);
        console.log(`用户限制: ${tenant.userLimit}`);
        console.log(`积分限制: ${tenant.creditLimit}`);
        console.log(`创建时间: ${new Date(tenant.createdAt).toLocaleString()}`);
        console.log(`更新时间: ${new Date(tenant.updatedAt).toLocaleString()}`);
      });
      
      console.log('\n' + '='.repeat(80));
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
