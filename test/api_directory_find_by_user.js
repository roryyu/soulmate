const http = require('http');
// 导入共享的headers配置
const headers = require('./headers-user');

// 测试数据
const testData = {
  // 可以为空，查询根目录
  parentId: 'cmojezkdh000914klgs5ugtdh', // 或者替换为实际的父目录ID
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

// 测试普通用户查询目录接口
async function testFindDirectoriesByUser() {
  console.log('\n=== 测试普通用户查询目录接口 ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/directory/find-by-user',
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, testData);
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 普通用户查询目录接口调用成功');
      console.log('响应目录:', response.body.directories);
      console.log(`找到 ${response.body.directories?.length || 0} 个目录`);
      return true;
    } else {
      console.log('❌ 普通用户查询目录接口调用失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 运行测试
async function runTest() {
  console.log('开始测试普通用户查询目录接口...');
  console.log('='.repeat(70));
  
  // 提示用户测试信息
  console.log('⚠️  测试说明：');
  console.log('   - 此接口用于普通用户查询有权限的目录');
  console.log('   - 接口会根据用户的DirectoryUserRole权限过滤目录');
  console.log('   - 仅返回READ_ONLY或READ_WRITE权限的目录');
  console.log('   - 测试数据中的parentId可以为空（查询根目录）或指定父目录ID');
  console.log('='.repeat(70));
  
  const result = await testFindDirectoriesByUser();
  
  console.log('\n' + '='.repeat(70));
  console.log('测试结果总结:');
  console.log(`总测试数: 1`);
  console.log(`成功数: ${result ? 1 : 0}`);
  console.log(`失败数: ${result ? 0 : 1}`);
  
  if (result) {
    console.log('🎉 测试通过!');
  } else {
    console.log('❌ 测试失败!');
  }
}

// 执行测试
runTest();
