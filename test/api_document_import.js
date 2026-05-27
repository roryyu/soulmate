const http = require('http');
// 导入共享的headers配置
const headers = require('./headers');

// 测试数据
const testData = {
  // 注意：需要替换为实际存在的projectId和documentIds
  projectId: 'replace-with-existing-project-id',
  documentIds: ['replace-with-existing-document-id-1', 'replace-with-existing-document-id-2']
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

// 测试批量导入文档
async function testImportDocuments() {
  console.log('\n=== 测试批量导入文档到ResearchDocument ===');
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/api/research/projects/${testData.projectId}/documents/import`,
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' }
  };

  try {
    const response = await sendRequest(options, { documentIds: testData.documentIds });
    console.log(`状态码: ${response.statusCode}`);
    console.log('响应:', JSON.stringify(response.body, null, 2));
    
    if (response.statusCode === 200 && response.body.success) {
      console.log('✅ 批量导入文档成功');
      console.log(`导入结果: ${response.body.importedCount}个成功，${response.body.skippedCount}个跳过`);
      return true;
    } else {
      console.log('❌ 批量导入文档失败');
      return false;
    }
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    return false;
  }
}

// 运行测试
async function runTest() {
  console.log('开始测试批量导入文档接口...');
  console.log('='.repeat(70));
  
  // 提示用户需要替换测试数据
  console.log('⚠️  请确保已在脚本中替换了以下实际存在的ID：');
  console.log('   - projectId: 实际存在的项目ID');
  console.log('   - documentIds: 实际存在的文档ID列表');
  console.log('='.repeat(70));
  
  const result = await testImportDocuments();
  
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
