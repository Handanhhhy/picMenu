import { NextResponse } from 'next/server';
import OSS from 'ali-oss';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { filename, contentType, size } = await request.json();

    // Validate request
    if (!filename || !contentType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Validate file size (optional)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (size && size > maxSize) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    // Configuration for Aliyun OSS
    const config = {
      accessKeyId: process.env.OSS_ACCESS_KEY!,
      accessKeySecret: process.env.OSS_ACCESS_SECRET!,
      bucket: process.env.OSS_BUCKET!,
      region: process.env.OSS_REGION!,
      endpoint: process.env.OSS_ENDPOINT || `${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`,
      secure: true
    };

    // Determine if we're using custom domain for access URLs
    const domain = process.env.OSS_CUSTOM_DOMAIN || 
                  `${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`;
    const accessUrl = `https://${domain}/${filename}`;
    
    // Choose upload method: PostObject (recommended for browser)
    const usePostObject = true;
    
    if (usePostObject) {
      // Generate PostObject policy and signature
      const expiration = new Date();
      expiration.setSeconds(expiration.getSeconds() + 600); // 10 minutes
      
      const policyObject = {
        expiration: expiration.toISOString(),
        conditions: [
          // Restrict file size (optional)
          ['content-length-range', 0, maxSize],
          // Match the exact key/filename
          ['eq', '$key', filename],
          // Match content type if needed
          contentType ? ['eq', '$Content-Type', contentType] : null
        ].filter(Boolean) // Remove null items
      };
      
      const policy = Buffer.from(JSON.stringify(policyObject)).toString('base64');
      const signature = crypto
        .createHmac('sha1', config.accessKeySecret)
        .update(policy)
        .digest('base64');
      
      const formData = {
        OSSAccessKeyId: config.accessKeyId,
        policy,
        signature,
        key: filename,
        success_action_status: '200',
        'Content-Type': contentType
      };
      
      const uploadUrl = `https://${config.bucket}.${config.region}.aliyuncs.com`;
      
      return NextResponse.json({ 
        uploadUrl, 
        formData, 
        accessUrl,
        method: 'post'
      });
    } else {
      // Alternative: Generate signed URL for PutObject
      const client = new OSS(config);
      
      const uploadUrl = client.signatureUrl(filename, {
        method: 'PUT',
        expires: 600, // 10 minutes
        headers: {
          'Content-Type': contentType,
        }
      });
      
      return NextResponse.json({ 
        uploadUrl, 
        accessUrl,
        method: 'put' 
      });
    }
  } catch (error) {
    console.error('Error generating OSS upload URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}