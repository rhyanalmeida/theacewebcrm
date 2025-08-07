#!/usr/bin/env node

/**
 * Supabase Storage Bucket Validation Script
 * Tests file upload, download, and storage bucket configurations
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('📁 ACE CRM Storage Bucket Validation');
console.log('====================================\n');

// Expected storage buckets configuration
const expectedBuckets = [
  {
    name: 'avatars',
    public: true,
    description: 'User profile pictures',
    maxFileSize: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  {
    name: 'company-logos',
    public: true,
    description: 'Company logos',
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml']
  },
  {
    name: 'ace-crm-files',
    public: false,
    description: 'General CRM files',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
  },
  {
    name: 'project-files',
    public: false,
    description: 'Project-specific files',
    maxFileSize: 100 * 1024 * 1024, // 100MB
    allowedMimeTypes: ['*'] // All file types allowed
  }
];

let testResults = {
  buckets: {},
  uploads: {},
  downloads: {},
  permissions: {},
  errors: []
};

async function listExistingBuckets(supabase) {
  console.log('📋 Listing existing storage buckets...\n');
  
  try {
    const { data, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log(`❌ Failed to list buckets: ${error.message}`);
      testResults.errors.push(`Failed to list buckets: ${error.message}`);
      return [];
    }
    
    console.log(`Found ${data.length} storage buckets:`);
    data.forEach(bucket => {
      const publicStatus = bucket.public ? 'Public' : 'Private';
      console.log(`   - ${bucket.name} (${publicStatus})`);
      testResults.buckets[bucket.name] = {
        exists: true,
        public: bucket.public,
        created_at: bucket.created_at,
        updated_at: bucket.updated_at
      };
    });
    
    return data;
    
  } catch (error) {
    console.log(`❌ Exception listing buckets: ${error.message}`);
    testResults.errors.push(`Exception listing buckets: ${error.message}`);
    return [];
  }
}

async function createMissingBuckets(supabase, existingBuckets) {
  console.log('\n🏗️  Checking and creating missing buckets...\n');
  
  const existingBucketNames = existingBuckets.map(b => b.name);
  
  for (const expectedBucket of expectedBuckets) {
    if (!existingBucketNames.includes(expectedBucket.name)) {
      console.log(`📦 Creating bucket: ${expectedBucket.name}`);
      
      try {
        const { data, error } = await supabase.storage.createBucket(expectedBucket.name, {
          public: expectedBucket.public,
          fileSizeLimit: expectedBucket.maxFileSize,
          allowedMimeTypes: expectedBucket.allowedMimeTypes.includes('*') ? undefined : expectedBucket.allowedMimeTypes
        });
        
        if (error) {
          console.log(`   ❌ Failed to create ${expectedBucket.name}: ${error.message}`);
          testResults.errors.push(`Failed to create ${expectedBucket.name}: ${error.message}`);
          testResults.buckets[expectedBucket.name] = {
            exists: false,
            error: error.message
          };
        } else {
          console.log(`   ✅ Created bucket: ${expectedBucket.name}`);
          testResults.buckets[expectedBucket.name] = {
            exists: true,
            public: expectedBucket.public,
            created: true
          };
        }
        
      } catch (error) {
        console.log(`   ❌ Exception creating ${expectedBucket.name}: ${error.message}`);
        testResults.errors.push(`Exception creating ${expectedBucket.name}: ${error.message}`);
      }
    } else {
      console.log(`✅ Bucket exists: ${expectedBucket.name}`);
    }
  }
}

function createTestFile(fileName, content, mimeType) {
  const testFilePath = path.join(__dirname, 'temp', fileName);
  
  // Ensure temp directory exists
  const tempDir = path.dirname(testFilePath);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  fs.writeFileSync(testFilePath, content);
  return testFilePath;
}

function createTestFiles() {
  const testFiles = {
    'test-avatar.jpg': {
      content: 'fake-jpeg-content-for-testing-avatars',
      mimeType: 'image/jpeg',
      bucket: 'avatars'
    },
    'test-logo.png': {
      content: 'fake-png-content-for-testing-logos',
      mimeType: 'image/png',
      bucket: 'company-logos'
    },
    'test-document.pdf': {
      content: 'fake-pdf-content-for-testing-documents',
      mimeType: 'application/pdf',
      bucket: 'ace-crm-files'
    },
    'test-project-file.txt': {
      content: 'This is a test file for project storage validation',
      mimeType: 'text/plain',
      bucket: 'project-files'
    }
  };
  
  const createdFiles = {};
  
  Object.entries(testFiles).forEach(([fileName, fileInfo]) => {
    const filePath = createTestFile(fileName, fileInfo.content, fileInfo.mimeType);
    createdFiles[fileName] = {
      ...fileInfo,
      localPath: filePath,
      size: Buffer.byteLength(fileInfo.content)
    };
  });
  
  return createdFiles;
}

async function testFileUpload(supabase, bucketName, fileName, fileInfo) {
  console.log(`   📤 Testing upload to ${bucketName}/${fileName}`);
  
  try {
    const fileContent = fs.readFileSync(fileInfo.localPath);
    
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileContent, {
        contentType: fileInfo.mimeType,
        cacheControl: '3600',
        upsert: true
      });
    
    if (error) {
      console.log(`      ❌ Upload failed: ${error.message}`);
      testResults.uploads[`${bucketName}/${fileName}`] = {
        success: false,
        error: error.message
      };
      return false;
    }
    
    console.log(`      ✅ Upload successful`);
    testResults.uploads[`${bucketName}/${fileName}`] = {
      success: true,
      path: data.path,
      size: fileInfo.size
    };
    return true;
    
  } catch (error) {
    console.log(`      ❌ Upload exception: ${error.message}`);
    testResults.uploads[`${bucketName}/${fileName}`] = {
      success: false,
      error: error.message
    };
    return false;
  }
}

async function testFileDownload(supabase, bucketName, fileName, isPublic) {
  console.log(`   📥 Testing download from ${bucketName}/${fileName}`);
  
  try {
    if (isPublic) {
      // Test public URL access
      const { data } = supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      if (data && data.publicUrl) {
        console.log(`      ✅ Public URL generated: ${data.publicUrl}`);
        testResults.downloads[`${bucketName}/${fileName}`] = {
          success: true,
          publicUrl: data.publicUrl,
          method: 'public'
        };
        return true;
      } else {
        console.log(`      ❌ Failed to generate public URL`);
        return false;
      }
      
    } else {
      // Test private file download
      const { data, error } = await supabase.storage
        .from(bucketName)
        .download(fileName);
      
      if (error) {
        console.log(`      ❌ Download failed: ${error.message}`);
        testResults.downloads[`${bucketName}/${fileName}`] = {
          success: false,
          error: error.message,
          method: 'private'
        };
        return false;
      }
      
      console.log(`      ✅ Download successful (${data.size} bytes)`);
      testResults.downloads[`${bucketName}/${fileName}`] = {
        success: true,
        size: data.size,
        method: 'private'
      };
      return true;
    }
    
  } catch (error) {
    console.log(`      ❌ Download exception: ${error.message}`);
    testResults.downloads[`${bucketName}/${fileName}`] = {
      success: false,
      error: error.message
    };
    return false;
  }
}

async function testFilePermissions(supabase, bucketName, fileName, isPublic) {
  console.log(`   🔒 Testing permissions for ${bucketName}/${fileName}`);
  
  try {
    // Test file listing
    const { data: files, error: listError } = await supabase.storage
      .from(bucketName)
      .list();
    
    if (listError) {
      console.log(`      ❌ List permission denied: ${listError.message}`);
      testResults.permissions[`${bucketName}/${fileName}`] = {
        list: false,
        error: listError.message
      };
      return false;
    }
    
    const fileExists = files.some(file => file.name === fileName);
    
    if (fileExists) {
      console.log(`      ✅ File listing works, file found`);
      testResults.permissions[`${bucketName}/${fileName}`] = {
        list: true,
        fileFound: true
      };
    } else {
      console.log(`      ⚠️  File listing works, but file not found`);
      testResults.permissions[`${bucketName}/${fileName}`] = {
        list: true,
        fileFound: false
      };
    }
    
    return true;
    
  } catch (error) {
    console.log(`      ❌ Permission test exception: ${error.message}`);
    testResults.permissions[`${bucketName}/${fileName}`] = {
      list: false,
      error: error.message
    };
    return false;
  }
}

async function testBucketOperations(supabase, testFiles) {
  console.log('\n🧪 Testing file operations...\n');
  
  for (const [fileName, fileInfo] of Object.entries(testFiles)) {
    const bucketConfig = expectedBuckets.find(b => b.name === fileInfo.bucket);
    
    if (!bucketConfig) {
      console.log(`⚠️  No bucket configuration found for ${fileInfo.bucket}`);
      continue;
    }
    
    console.log(`🗂️  Testing operations for bucket: ${fileInfo.bucket}`);
    
    // Test upload
    const uploadSuccess = await testFileUpload(supabase, fileInfo.bucket, fileName, fileInfo);
    
    if (uploadSuccess) {
      // Test download
      await testFileDownload(supabase, fileInfo.bucket, fileName, bucketConfig.public);
      
      // Test permissions
      await testFilePermissions(supabase, fileInfo.bucket, fileName, bucketConfig.public);
    }
    
    console.log('');
  }
}

async function testFileSizeLimits(supabase) {
  console.log('📏 Testing file size limits...\n');
  
  // Create a larger test file for size limit testing
  const largecontent = 'x'.repeat(6 * 1024 * 1024); // 6MB
  const largeFilePath = createTestFile('large-test-file.txt', largecontent, 'text/plain');
  
  try {
    // Try uploading to avatars bucket (2MB limit)
    console.log('   Testing size limit for avatars bucket (2MB limit with 6MB file)...');
    
    const fileContent = fs.readFileSync(largeFilePath);
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload('large-test-file.txt', fileContent, {
        contentType: 'text/plain'
      });
    
    if (error) {
      if (error.message.includes('size') || error.message.includes('limit') || error.message.includes('too large')) {
        console.log('   ✅ Size limit properly enforced');
      } else {
        console.log(`   ⚠️  Upload failed for different reason: ${error.message}`);
      }
    } else {
      console.log('   ❌ Size limit not enforced - large file was accepted');
      
      // Clean up if uploaded
      await supabase.storage.from('avatars').remove(['large-test-file.txt']);
    }
    
  } catch (error) {
    console.log(`   ❌ Size limit test exception: ${error.message}`);
  }
  
  // Clean up test file
  fs.unlinkSync(largeFilePath);
}

async function cleanupTestFiles(supabase, testFiles) {
  console.log('\n🧹 Cleaning up test files...\n');
  
  for (const [fileName, fileInfo] of Object.entries(testFiles)) {
    try {
      const { error } = await supabase.storage
        .from(fileInfo.bucket)
        .remove([fileName]);
      
      if (error) {
        console.log(`   ⚠️  Could not remove ${fileInfo.bucket}/${fileName}: ${error.message}`);
      } else {
        console.log(`   ✅ Removed ${fileInfo.bucket}/${fileName}`);
      }
      
      // Remove local file
      if (fs.existsSync(fileInfo.localPath)) {
        fs.unlinkSync(fileInfo.localPath);
      }
      
    } catch (error) {
      console.log(`   ⚠️  Cleanup error for ${fileName}: ${error.message}`);
    }
  }
  
  // Remove temp directory
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function generateStorageReport() {
  console.log('\n====================================');
  console.log('📊 Storage Validation Summary Report');
  console.log('====================================\n');
  
  // Bucket summary
  console.log('📦 Bucket Status:');
  expectedBuckets.forEach(expectedBucket => {
    const bucketResult = testResults.buckets[expectedBucket.name];
    if (bucketResult && bucketResult.exists) {
      const status = bucketResult.created ? '✅ (Created)' : '✅ (Existing)';
      const visibility = bucketResult.public ? 'Public' : 'Private';
      console.log(`   ${expectedBucket.name}: ${status} - ${visibility}`);
    } else {
      console.log(`   ${expectedBucket.name}: ❌ Missing or failed`);
    }
  });
  
  // Upload summary
  console.log('\n📤 Upload Tests:');
  const uploadTests = Object.keys(testResults.uploads);
  const successfulUploads = uploadTests.filter(test => testResults.uploads[test].success).length;
  console.log(`   Successful: ${successfulUploads}/${uploadTests.length} uploads\n`);
  
  uploadTests.forEach(test => {
    const result = testResults.uploads[test];
    const status = result.success ? '✅' : '❌';
    console.log(`   ${test}: ${status}`);
  });
  
  // Download summary
  console.log('\n📥 Download Tests:');
  const downloadTests = Object.keys(testResults.downloads);
  const successfulDownloads = downloadTests.filter(test => testResults.downloads[test].success).length;
  console.log(`   Successful: ${successfulDownloads}/${downloadTests.length} downloads\n`);
  
  downloadTests.forEach(test => {
    const result = testResults.downloads[test];
    const status = result.success ? '✅' : '❌';
    const method = result.method ? `(${result.method})` : '';
    console.log(`   ${test}: ${status} ${method}`);
  });
  
  // Permission summary
  console.log('\n🔒 Permission Tests:');
  const permissionTests = Object.keys(testResults.permissions);
  const successfulPermissions = permissionTests.filter(test => testResults.permissions[test].list).length;
  console.log(`   Accessible: ${successfulPermissions}/${permissionTests.length} buckets\n`);
  
  permissionTests.forEach(test => {
    const result = testResults.permissions[test];
    const status = result.list ? '✅' : '❌';
    console.log(`   ${test}: ${status}`);
  });
  
  // Error summary
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    testResults.errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  const missingBuckets = expectedBuckets.filter(bucket => 
    !testResults.buckets[bucket.name] || !testResults.buckets[bucket.name].exists
  );
  
  if (missingBuckets.length > 0) {
    console.log(`   ⚠️  Create missing buckets: ${missingBuckets.map(b => b.name).join(', ')}`);
  }
  
  if (successfulUploads === 0 && uploadTests.length > 0) {
    console.log('   ⚠️  No uploads succeeded - check storage permissions and bucket policies');
  }
  
  if (testResults.errors.length === 0 && successfulUploads === uploadTests.length) {
    console.log('   🎉 Storage system is working perfectly!');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Verify bucket policies match your security requirements');
  console.log('   2. Set up appropriate file size limits for each bucket');
  console.log('   3. Configure file type restrictions if needed');
  console.log('   4. Set up automated cleanup for temporary files');
  console.log('   5. Consider implementing virus scanning for uploaded files');
}

async function runStorageValidation() {
  if (!SUPABASE_URL || (!SUPABASE_ANON_KEY && !SUPABASE_SERVICE_KEY)) {
    console.error('❌ Missing Supabase configuration');
    process.exit(1);
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  console.log('Starting comprehensive storage validation...\n');
  
  try {
    // List existing buckets
    const existingBuckets = await listExistingBuckets(supabase);
    
    // Create missing buckets (only with service role)
    if (SUPABASE_SERVICE_KEY) {
      await createMissingBuckets(supabase, existingBuckets);
    } else {
      console.log('\n⚠️  Service key not provided - skipping bucket creation');
    }
    
    // Create test files
    const testFiles = createTestFiles();
    
    // Test bucket operations
    await testBucketOperations(supabase, testFiles);
    
    // Test file size limits
    if (SUPABASE_SERVICE_KEY) {
      await testFileSizeLimits(supabase);
    }
    
    // Clean up test files
    await cleanupTestFiles(supabase, testFiles);
    
    // Generate comprehensive report
    await generateStorageReport();
    
    console.log('\n🏁 Storage validation completed!');
    
  } catch (error) {
    console.error('❌ Storage validation failed:', error);
    testResults.errors.push(`Storage validation failed: ${error.message}`);
    process.exit(1);
  }
}

runStorageValidation();