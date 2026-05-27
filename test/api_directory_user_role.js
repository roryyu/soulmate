const http = require('http');
// 导入共享的headers配置
const headers = require('./headers-tenant.js');

// 测试数据
const testData = {
  // 注意：需要替换为实际存在的directoryId和roleId
  directoryId: 'cmojf1wqj000f14klpqait5j1',
  roleId: 'cmojekgyk000214kltmn8urce',
  // 注意：需要替换为实际存在的userIds
  userIds: ['cmoidmoos000416mr3d1d51wd', 'cmoidtes10004j509pk9khjfb','cmojiyaby000drepot7fzmcb8']
};

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

// 1. 测试添加目录用户角色关联
async function testAddUserRole() {
  console.log('\n=== 测试添加目录用户角色关联 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/directory/add-user-role',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, testData);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 添加目录用户角色关联成功');
      return true;
    } else {
      console.log('❌ 添加目录用户角色关联失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 2. 测试删除目录用户角色关联
async function testDeleteUserRole() {
  console.log('\n=== 测试删除目录用户角色关联 ===');
  
  const deleteData = {
    directoryId: testData.directoryId,
    userIds: testData.userIds
  };

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/directory/delete-user-role',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, deleteData);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 删除目录用户角色关联成功');
      return true;
    } else {
      console.log('❌ 删除目录用户角色关联失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runAllTests() {
  console.log('开始测试目录用户角色关联接口...');
  console.log('='.repeat(70));
  
  // 提示用户需要替换测试数据
  console.log('⚠️  请确保已在脚本中替换了以下实际存在的ID：');
  console.log('   - directoryId: 实际存在的目录ID');
  console.log('   - roleId: 实际存在的角色ID');
  console.log('   - userIds: 实际存在的用户ID列表');
  console.log('='.repeat(70));
  
  const results = [];
  results.push(await testAddUserRole());
  // 先添加成功后再删除
  if (results[0]) {
    //results.push(await testDeleteUserRole());
  } else {
    results.push(false);
  }
  
  console.log('\n' + '='.repeat(70));
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
