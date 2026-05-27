const http = require('http');
// 导入共享的headers配置
const headers = require('./headers-tenant.js');

// 生成随机数后缀
const randomSuffix = Date.now();

// 测试数据
const testDirectory = {
  name: `测试目录_${randomSuffix}`,
  description: `这是一个测试目录的描述_${randomSuffix}`,
  parentId: 'cmojf1wqj000f14klpqait5j1',
};

let createdDirectoryId = '';

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

// 1. 测试添加目录
async function testAddDirectory() {
  console.log('\n=== 测试添加目录 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/directory/add',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, testDirectory);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      createdDirectoryId = response.body.directory.id;
      console.log('✅ 添加目录成功');
      return true;
    } else {
      console.log('❌ 添加目录失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 2. 测试查询目录列表
async function testFindDirectories() {
  console.log('\n=== 测试查询目录列表 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/directory/find',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options,{});
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log(`✅ 查询目录列表成功，共找到 ${response.body.total} 个目录`);
      return true;
    } else {
      console.log('❌ 查询目录列表失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 3. 测试查询目录树
async function testFindDirectoryTree() {
  console.log('\n=== 测试查询目录树 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/directory/find',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, { treeView: true });
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log(`✅ 查询目录树成功，共找到 ${response.body.total} 个根目录`);
      return true;
    } else {
      console.log('❌ 查询目录树失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 4. 测试编辑目录
async function testEditDirectory() {
  if (!createdDirectoryId) {
    console.log('\n=== 测试编辑目录 ===');
    console.log('❌ 没有可编辑的目录ID');
    return false;
  }
  
  console.log('\n=== 测试编辑目录 ===');
  
  const updatedDirectory = {
    name: `更新后的测试目录_${randomSuffix}`,
    description: `这是更新后的测试目录描述_${randomSuffix}`
  };

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/directory/edit/${createdDirectoryId}`,
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, updatedDirectory);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 编辑目录成功');
      return true;
    } else {
      console.log('❌ 编辑目录失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 5. 测试删除目录
async function testDeleteDirectory() {
  if (!createdDirectoryId) {
    console.log('\n=== 测试删除目录 ===');
    console.log('❌ 没有可删除的目录ID');
    return false;
  }
  
  console.log('\n=== 测试删除目录 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/directory/delete/${createdDirectoryId}`,
    method: 'DELETE',
    headers: { ...headers }
  };

  try {
    const response = await sendRequest(options);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 删除目录成功');
      return true;
    } else {
      console.log('❌ 删除目录失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始测试目录CRUD接口...');
  console.log('='.repeat(60));
  
  const results = [];
  results.push(await testAddDirectory());
  results.push(await testFindDirectories());
  results.push(await testFindDirectoryTree());
  results.push(await testEditDirectory());
  //results.push(await testDeleteDirectory());
  
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
