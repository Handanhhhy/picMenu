export const uploadToOSS = async (file: File) => {
  try {
    // 1. 首先获取预签名 URL
    const ext = file.name.split('.').pop();
    const filename = "test.jpg"
    // const filename = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    

    
    const response = await fetch('/api/oss-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ filename,headers: {
        'Content-Type': file.type,
      } }),
    });

    if (!response.ok) {
      throw new Error('Failed to get upload URL');
    }
    console.log('get upload URL')
    const { url } = await response.json();
    console.log(url);
    console.log('upload file: ', file.type)
    // 2. 使用预签名 URL 直接上传文件到 OSS
    const uploadResponse = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    }).catch((err) => {
      console.error('Upload error:', err);
      throw err;
    });

    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }

    // 3. 返回可访问的文件 URL
    // 注意：这里需要构造公开访问的 URL
    const publicUrl = `https://${process.env.NEXT_PUBLIC_OSS_BUCKET}.${process.env.NEXT_PUBLIC_OSS_REGION}.aliyuncs.com/${filename}`;
    
    return { url: publicUrl };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}; 