const http = require('http');
// 导入共享的headers配置
const headers = require('./headers');

// 生成随机数后缀
const randomSuffix = Date.now();

// 测试数据
const testRole = {
  name: `测试角色_${randomSuffix}`,
  permission: `READ_WRITE_${randomSuffix}`
};

let createdRoleId = '';

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

// 1. 测试添加角色
async function testAddRole() {
  console.log('\n=== 测试添加角色 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/role/add',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, testRole);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      createdRoleId = response.body.role.id;
      console.log('✅ 添加角色成功');
      return true;
    } else {
      console.log('❌ 添加角色失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 2. 测试查询角色列表
async function testFindRoles() {
  console.log('\n=== 测试查询角色列表 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/role/find',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options,{});
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log(`✅ 查询角色列表成功，共找到 ${response.body.total} 个角色`);
      return true;
    } else {
      console.log('❌ 查询角色列表失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 3. 测试编辑角色
async function testEditRole() {
  if (!createdRoleId) {
    console.log('\n=== 测试编辑角色 ===');
    console.log('❌ 没有可编辑的角色ID');
    return false;
  }
  
  console.log('\n=== 测试编辑角色 ===');
  
  const updatedRole = {
    name: `更新后的测试角色_${randomSuffix}`,
    permission: `READ_ONLY_${randomSuffix}`
  };

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/role/edit/${createdRoleId}`,
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, updatedRole);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 编辑角色成功');
      return true;
    } else {
      console.log('❌ 编辑角色失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 4. 测试删除角色
async function testDeleteRole() {
  if (!createdRoleId) {
    console.log('\n=== 测试删除角色 ===');
    console.log('❌ 没有可删除的角色ID');
    return false;
  }
  
  console.log('\n=== 测试删除角色 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/role/delete/${createdRoleId}`,
    method: 'DELETE',
    headers: { ...headers }
  };

  try {
    const response = await sendRequest(options);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 删除角色成功');
      return true;
    } else {
      console.log('❌ 删除角色失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始测试角色CRUD接口...');
  console.log('='.repeat(60));
  
  const results = [];
  results.push(await testAddRole());
  results.push(await testFindRoles());
  results.push(await testEditRole());
  results.push(await testDeleteRole());
  
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
