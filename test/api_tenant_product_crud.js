const http = require('http');
// 导入共享的headers配置
const headers = require('./headers');

// 生成随机数后缀
const randomSuffix = Date.now();

// 测试数据
const testProduct = {
  name: `测试租户产品_${randomSuffix}`,
  userLimit: 10,
  creditLimit: 2000
};

let createdProductId = '';

// 辅助函数：发送HTTP请求
async function sendRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({ 
            statusCode: res.statusCode, 
            headers: res.headers, 
            body: JSON.parse(responseData) 
          });
        } catch (error) {
          resolve({ 
            statusCode: res.statusCode, 
            headers: res.headers, 
            body: responseData 
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// 1. 测试添加租户产品
async function testAddTenantProduct() {
  console.log('\n=== 测试添加租户产品 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/tenant-product/add',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, testProduct);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      createdProductId = response.body.tenantProduct.id;
      console.log('✅ 添加租户产品成功');
      return true;
    } else {
      console.log('❌ 添加租户产品失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 2. 测试查询租户产品
async function testFindTenantProducts() {
  console.log('\n=== 测试查询租户产品 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/tenant-product/find',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options,{});
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log(`✅ 查询租户产品成功，共找到 ${response.body.total} 个产品`);
      return true;
    } else {
      console.log('❌ 查询租户产品失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 3. 测试编辑租户产品
async function testEditTenantProduct() {
  if (!createdProductId) {
    console.log('\n=== 测试编辑租户产品 ===');
    console.log('❌ 没有可编辑的产品ID');
    return false;
  }
  
  console.log('\n=== 测试编辑租户产品 ===');
  
  const updatedProduct = {
    name: `更新后的测试产品_${randomSuffix}`,
    userLimit: 15,
    creditLimit: 3000
  };

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/tenant-product/edit/${createdProductId}`,
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, updatedProduct);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 编辑租户产品成功');
      return true;
    } else {
      console.log('❌ 编辑租户产品失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 4. 测试删除租户产品
async function testDeleteTenantProduct() {
  if (!createdProductId) {
    console.log('\n=== 测试删除租户产品 ===');
    console.log('❌ 没有可删除的产品ID');
    return false;
  }
  
  console.log('\n=== 测试删除租户产品 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/tenant-product/delete/${createdProductId}`,
    method: 'DELETE',
    headers: { ...headers }
  };

  try {
    const response = await sendRequest(options);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 删除租户产品成功');
      return true;
    } else {
      console.log('❌ 删除租户产品失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始测试租户产品CRUD接口...');
  console.log('='.repeat(60));
  
  const results = [];
  results.push(await testAddTenantProduct());
  results.push(await testFindTenantProducts());
  results.push(await testEditTenantProduct());
  //results.push(await testDeleteTenantProduct());
  
  console.log('\n' + '='.repeat(60));
  console.log('测试结果总结:');
  console.log(`总测试数: ${results.length}`);
  console.log(`成功数: ${results.filter(r => r).length}`);
  console.log(`失败数: ${results.filter(r => !r).length}`);
  
  if (results.every(r => r)) {
    console.log('🎉 所有测试通过!');
  } else {
    console.log('❌ 部分测试失败!');
  }
}

// 执行测试
runAllTests();
