# Soulmate 数据库设计总结

## 1. 租户相关模型

### 1.1 TenantProduct 表
"id" TEXT NOT NULL
"name" TEXT
"userLimit" INTEGER
"creditLimit" INTEGER
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "TenantProduct_pkey" PRIMARY KEY ("id")

### 1.2 Tenant 表
"id" TEXT NOT NULL
"name" TEXT
"productId" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "Tenant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "TenantProduct"("id")

## 2. 目录与权限相关模型

### 2.1 Directory 表
"id" TEXT NOT NULL
"name" TEXT
"parentId" TEXT
"description" TEXT
"tenantId" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "Directory_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "Directory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
外键CONSTRAINT "Directory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Directory"("id")

### 2.2 Role 表
"id" TEXT NOT NULL
"name" TEXT
"permission" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "Role_pkey" PRIMARY KEY ("id")

### 2.3 DirectoryUserRole 表
"id" TEXT NOT NULL
"directoryId" TEXT
"userId" TEXT
"roleId" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "DirectoryUserRole_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "DirectoryUserRole_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "Directory"("id")
外键CONSTRAINT "DirectoryUserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
外键CONSTRAINT "DirectoryUserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id")
唯一约束CONSTRAINT "DirectoryUserRole_directoryId_userId_key" UNIQUE ("directoryId", "userId")

## 3. 文档管理相关模型

### 3.1 Document 表
"id" TEXT NOT NULL
"fileName" TEXT
"fileType" TEXT
"content" TEXT
"fileData" TEXT
"status" TEXT NOT NULL DEFAULT 'pending'
"directoryId" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "Document_directoryId_fkey" FOREIGN KEY ("directoryId") REFERENCES "Directory"("id")

## 4. 认证相关模型

### 4.1 User 表
"id" TEXT NOT NULL
"email" TEXT NOT NULL
"phone" TEXT
"password" TEXT NOT NULL
"name" TEXT
"role" TEXT NOT NULL DEFAULT 'TEACHER'
"tenantId" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "User_pkey" PRIMARY KEY ("id")
唯一约束CONSTRAINT "User_email_key" UNIQUE ("email")
唯一约束CONSTRAINT "User_phone_key" UNIQUE ("phone")
外键CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")

### 4.2 SmsCode 表
"id" TEXT NOT NULL
"phone" TEXT NOT NULL
"code" TEXT NOT NULL
"type" TEXT NOT NULL DEFAULT 'LOGIN'
"used" BOOLEAN NOT NULL DEFAULT false
"expires" TIMESTAMP(3) NOT NULL
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "SmsCode_pkey" PRIMARY KEY ("id")
索引INDEX "SmsCode_phone_type_idx" ("phone", "type")
索引INDEX "SmsCode_phone_code_idx" ("phone", "code")

### 4.3 Account 表
"id" TEXT NOT NULL
"userId" TEXT NOT NULL
"type" TEXT NOT NULL
"provider" TEXT NOT NULL
"providerAccountId" TEXT NOT NULL
"refresh_token" TEXT
"access_token" TEXT
"expires_at" INTEGER
"token_type" TEXT
"scope" TEXT
"id_token" TEXT
"session_state" TEXT
索引CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
唯一约束CONSTRAINT "Account_provider_providerAccountId_key" UNIQUE ("provider", "providerAccountId")
外键CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE

### 4.4 Session 表
"id" TEXT NOT NULL
"sessionToken" TEXT NOT NULL
"userId" TEXT NOT NULL
"expires" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
唯一约束CONSTRAINT "Session_sessionToken_key" UNIQUE ("sessionToken")
外键CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE

### 4.5 VerificationToken 表
"identifier" TEXT NOT NULL
"token" TEXT NOT NULL
"expires" TIMESTAMP(3) NOT NULL
唯一约束CONSTRAINT "VerificationToken_token_key" UNIQUE ("token")
唯一约束CONSTRAINT "VerificationToken_identifier_token_key" UNIQUE ("identifier", "token")

## 5. Soulmates (Research Pro) 模块

### 5.1 ResearchProject 表
"id" TEXT NOT NULL
"userId" TEXT NOT NULL
"title" TEXT NOT NULL
"field" TEXT NOT NULL
"description" TEXT
"status" TEXT NOT NULL DEFAULT 'DRAFT'
"prompt" TEXT
"sampleRate" INTEGER NOT NULL DEFAULT 44100
"bitrate" INTEGER NOT NULL DEFAULT 256000
"format" TEXT NOT NULL DEFAULT 'mp3'
"tocDataId" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "ResearchProject_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "ResearchProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
外键CONSTRAINT "ResearchResearch_tocDataId_fkey" FOREIGN KEY ("tocDataId") REFERENCES "TocData"("id")

### 5.2 ResearchIdea 表
"id" TEXT NOT NULL
"projectId" TEXT NOT NULL
"title" TEXT NOT NULL
"rationale" TEXT NOT NULL
"isAdopted" BOOLEAN NOT NULL DEFAULT false
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "ResearchIdea_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "ResearchIdea_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE

### 5.3 ResearchSearch 表
"id" TEXT NOT NULL
"projectId" TEXT NOT NULL
"userTopic" TEXT NOT NULL
"cnkiQuery" TEXT NOT NULL
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "ResearchSearch_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "ResearchSearch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE

### 5.4 ResearchReference 表
"id" TEXT NOT NULL
"projectId" TEXT NOT NULL
"fileName" TEXT NOT NULL
"summary" TEXT NOT NULL
"innovationPoints" TEXT NOT NULL
"methodology" TEXT
"keyPages" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "ResearchReference_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "ResearchReference_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE

## 6. 文献速读模块

### 6.1 ResearchDocument 表
"id" TEXT NOT NULL
"projectId" TEXT NOT NULL
"documentId" TEXT
"embeddingStatus" TEXT NOT NULL DEFAULT 'pending'
"embeddingProgress" INTEGER NOT NULL DEFAULT 0
"embeddingError" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "ResearchDocument_pkey" PRIMARY KEY ("id")
索引INDEX "ResearchDocument_projectId_createdAt_idx" ("projectId", "createdAt")
外键CONSTRAINT "ResearchDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE
外键CONSTRAINT "ResearchDocument_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id")

### 6.2 DocumentChunk 表
"id" TEXT NOT NULL
"documentId" TEXT NOT NULL
"chunkIndex" INTEGER NOT NULL
"content" TEXT NOT NULL
"embedding" DECIMAL(65,30)[] NOT NULL
"tokenCount" INTEGER
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
索引INDEX "DocumentChunk_documentId_idx" ("documentId")
外键CONSTRAINT "DocumentChunk_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ResearchDocument"("id") ON DELETE CASCADE

### 6.3 DocumentAnalysis 表
"id" TEXT NOT NULL
"documentId" TEXT NOT NULL
"prompt" TEXT NOT NULL
"content" TEXT NOT NULL
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "DocumentAnalysis_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "DocumentAnalysis_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ResearchDocument"("id") ON DELETE CASCADE

### 6.4 DocumentChat 表
"id" TEXT NOT NULL
"documentId" TEXT NOT NULL
"question" TEXT NOT NULL
"answer" TEXT NOT NULL
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "DocumentChat_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "DocumentChat_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "ResearchDocument"("id") ON DELETE CASCADE

## 7. 研究写作模块

### 7.1 ResearchWriting 表
"id" TEXT NOT NULL
"projectId" TEXT NOT NULL
"type" TEXT NOT NULL
"content" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "ResearchWriting_pkey" PRIMARY KEY ("id")
唯一约束CONSTRAINT "ResearchWriting_projectId_type_key" UNIQUE ("projectId", "type")
外键CONSTRAINT "ResearchWriting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE

## 8. 论文润色模块

### 8.1 ResearchPaper 表
"id" TEXT NOT NULL
"projectId" TEXT NOT NULL
"title" TEXT
"content" TEXT NOT NULL
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "ResearchPaper_pkey" PRIMARY KEY ("id")
唯一约束CONSTRAINT "ResearchPaper_projectId_key" UNIQUE ("projectId")
外键CONSTRAINT "ResearchPaper_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE

## 9. 文献综述大纲模块

### 9.1 ResearchOutline 表
"id" TEXT NOT NULL
"projectId" TEXT NOT NULL
"title" TEXT NOT NULL
"content" TEXT NOT NULL
"sourceDocs" TEXT NOT NULL
"status" TEXT NOT NULL DEFAULT 'draft'
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "ResearchOutline_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "ResearchOutline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE

## 10. 音乐相关模型

### 10.1 TocData 表
"id" TEXT NOT NULL
"name" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "TocData_pkey" PRIMARY KEY ("id")

### 10.2 MusicCover 表
"id" TEXT NOT NULL
"name" TEXT
"coverFeatureId" TEXT
"structureResult" TEXT
"base64data" TEXT
"audioDuration" INTEGER
"audioFilePath" TEXT
"audioFileUrl" TEXT
"status" TEXT NOT NULL DEFAULT 'pending'
"error" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "MusicCover_pkey" PRIMARY KEY ("id")

### 10.3 MusicCoverResource 表
"id" TEXT NOT NULL
"researchProjectId" TEXT
"musicCoverId" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "MusicCoverResource_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "MusicCoverResource_researchProjectId_fkey" FOREIGN KEY ("researchProjectId") REFERENCES "ResearchProject"("id") ON DELETE CASCADE
外键CONSTRAINT "MusicCoverResource_musicCoverId_fkey" FOREIGN KEY ("musicCoverId") REFERENCES "MusicCover"("id") ON DELETE CASCADE

## 11. AI 对话记录模块

### 11.1 AIConversation 表
"id" TEXT NOT NULL
"userId" TEXT
"userName" TEXT
"module" TEXT NOT NULL
"model" TEXT NOT NULL
"prompt" TEXT NOT NULL
"response" TEXT
"tokens" INTEGER
"duration" INTEGER
"error" TEXT
"metadata" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
索引INDEX "AIConversation_userId_idx" ("userId")
索引INDEX "AIConversation_userName_idx" ("userName")
索引INDEX "AIConversation_module_idx" ("module")
索引INDEX "AIConversation_createdAt_idx" ("createdAt")

## 12. 支付相关模型

### 12.1 Product 表
"id" TEXT NOT NULL
"name" TEXT NOT NULL
"description" TEXT
"price" DECIMAL(10,2) NOT NULL
"originalPrice" DECIMAL(10,2)
"currency" TEXT NOT NULL DEFAULT 'CNY'
"type" TEXT NOT NULL
"duration" INTEGER
"credits" INTEGER
"isActive" BOOLEAN NOT NULL DEFAULT true
"sortOrder" INTEGER NOT NULL DEFAULT 0
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "Product_pkey" PRIMARY KEY ("id")

### 12.2 Order 表
"id" TEXT NOT NULL
"userId" TEXT
"productId" TEXT
"outTradeNo" TEXT NOT NULL
"tradeNo" TEXT
"subject" TEXT NOT NULL
"body" TEXT
"totalAmount" DECIMAL(10,2) NOT NULL
"currency" TEXT NOT NULL DEFAULT 'CNY'
"status" TEXT NOT NULL DEFAULT 'PENDING'
"payMethod" TEXT
"paidAt" TIMESTAMP(3)
"expiredAt" TIMESTAMP(3)
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
唯一约束CONSTRAINT "Order_outTradeNo_key" UNIQUE ("outTradeNo")
索引INDEX "Order_userId_idx" ("userId")
索引INDEX "Order_outTradeNo_idx" ("outTradeNo")
索引INDEX "Order_tradeNo_idx" ("tradeNo")
索引INDEX "Order_status_idx" ("status")
索引INDEX "Order_createdAt_idx" ("createdAt")
外键CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
外键CONSTRAINT "Order_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL

### 12.3 PaymentRecord 表
"id" TEXT NOT NULL
"orderId" TEXT NOT NULL
"outTradeNo" TEXT NOT NULL
"tradeNo" TEXT
"tradeStatus" TEXT
"totalAmount" DECIMAL(10,2) NOT NULL
"receiptAmount" DECIMAL(10,2)
"buyerPayAmount" DECIMAL(10,2)
"buyerId" TEXT
"buyerLogonId" TEXT
"gmtCreate" TIMESTAMP(3)
"gmtPayment" TIMESTAMP(3)
"notifyId" TEXT
"notifyTime" TIMESTAMP(3)
"rawNotifyData" TEXT
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
索引INDEX "PaymentRecord_orderId_idx" ("orderId")
索引INDEX "PaymentRecord_outTradeNo_idx" ("outTradeNo")
索引INDEX "PaymentRecord_tradeNo_idx" ("tradeNo")
索引INDEX "PaymentRecord_tradeStatus_idx" ("tradeStatus")
外键CONSTRAINT "PaymentRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE

## 13. 会员与积分模型

### 13.1 UserMembership 表
"id" TEXT NOT NULL
"userId" TEXT NOT NULL
"productId" TEXT
"orderId" TEXT
"startAt" TIMESTAMP(3) NOT NULL
"endAt" TIMESTAMP(3) NOT NULL
"status" TEXT NOT NULL DEFAULT 'ACTIVE'
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "UserMembership_pkey" PRIMARY KEY ("id")
索引INDEX "UserMembership_userId_status_idx" ("userId", "status")
索引INDEX "UserMembership_endAt_idx" ("endAt")
外键CONSTRAINT "UserMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
外键CONSTRAINT "UserMembership_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL

### 13.2 UserCredit 表
"id" TEXT NOT NULL
"userId" TEXT NOT NULL
"balance" INTEGER NOT NULL DEFAULT 0
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "UserCredit_pkey" PRIMARY KEY ("id")
唯一约束CONSTRAINT "UserCredit_userId_key" UNIQUE ("userId")
外键CONSTRAINT "UserCredit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE

### 13.3 CreditTransaction 表
"id" TEXT NOT NULL
"userId" TEXT NOT NULL
"amount" INTEGER NOT NULL
"type" TEXT NOT NULL
"description" TEXT
"orderId" TEXT
"operationType" TEXT
"balanceAfter" INTEGER NOT NULL
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "CreditTransaction_pkey" PRIMARY KEY ("id")
索引INDEX "CreditTransaction_userId_idx" ("userId")
索引INDEX "CreditTransaction_createdAt_idx" ("createdAt")
索引INDEX "CreditTransaction_type_idx" ("type")
外键CONSTRAINT "CreditTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE

### 13.4 AIOperationConfig 表
"id" TEXT NOT NULL
"operationType" TEXT NOT NULL
"creditCost" INTEGER NOT NULL DEFAULT 10
"description" TEXT
"isActive" BOOLEAN NOT NULL DEFAULT true
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "AIOperationConfig_pkey" PRIMARY KEY ("id")
唯一约束CONSTRAINT "AIOperationConfig_operationType_key" UNIQUE ("operationType")

### 13.5 SystemSetting 表
"key" TEXT NOT NULL
"value" TEXT NOT NULL
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")

## 14. 问题反馈模块

### 14.1 FeedbackType 表
"id" TEXT NOT NULL
"name" TEXT NOT NULL
"description" TEXT
"sortOrder" INTEGER NOT NULL DEFAULT 0
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "FeedbackType_pkey" PRIMARY KEY ("id")

### 14.2 Feedback 表
"id" TEXT NOT NULL
"userId" TEXT
"userName" TEXT
"userEmail" TEXT
"userPhone" TEXT
"typeId" TEXT NOT NULL
"title" TEXT NOT NULL
"description" TEXT NOT NULL
"status" TEXT NOT NULL DEFAULT 'PENDING'
"priority" TEXT NOT NULL DEFAULT 'NORMAL'
"assignedTo" TEXT
"attachments" TEXT
"resolvedAt" TIMESTAMP(3)
"closedAt" TIMESTAMP(3)
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
索引INDEX "Feedback_userId_idx" ("userId")
索引INDEX "Feedback_typeId_idx" ("typeId")
索引INDEX "Feedback_status_idx" ("status")
索引INDEX "Feedback_priority_idx" ("priority")
索引INDEX "Feedback_createdAt_idx" ("createdAt")
外键CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL
外键CONSTRAINT "Feedback_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "FeedbackType"("id") ON DELETE CASCADE

### 14.3 FeedbackReply 表
"id" TEXT NOT NULL
"feedbackId" TEXT NOT NULL
"userId" TEXT
"userName" TEXT
"content" TEXT NOT NULL
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "FeedbackReply_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "FeedbackReply_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE
外键CONSTRAINT "FeedbackReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL

### 14.4 FeedbackStatus 表
"id" TEXT NOT NULL
"feedbackId" TEXT NOT NULL
"status" TEXT NOT NULL
"changedBy" TEXT
"changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
索引CONSTRAINT "FeedbackStatus_pkey" PRIMARY KEY ("id")
外键CONSTRAINT "FeedbackStatus_feedbackId_fkey" FOREIGN KEY ("feedbackId") REFERENCES "Feedback"("id") ON DELETE CASCADE

## 15. 处方相关模型

### 15.1 Prescription 表
"id" TEXT NOT NULL
"name" TEXT NOT NULL
"prescriptionData" TEXT NOT NULL
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
"updatedAt" TIMESTAMP(3) NOT NULL
索引CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
