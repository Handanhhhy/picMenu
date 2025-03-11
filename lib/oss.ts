export const uploadToOSS = async (file: File, onProgress?: (percent: number) => void): Promise<{ url: string }> => {
  try {
    // 1. Generate unique filename with proper extension
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const filename = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
    
    // 2. Request signature and policy from backend
    const response = await fetch('/api/oss-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        contentType: file.type,
        size: file.size // Send file size for server-side validation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get upload credentials: ${response.status} - ${errorText}`);
    }
    
    const { 
      uploadUrl, 
      formData, 
      accessUrl, // Direct access URL after upload
      method // 'post' or 'put'
    } = await response.json();
    
    // 3. Upload file to OSS using the appropriate method
    let uploadSuccess = false;
    
    if (method === 'post' && formData) {
      // Using OSS PostObject method (recommended for browser uploads)
      uploadSuccess = await uploadWithPostObject(uploadUrl, formData, file, onProgress);
    } else {
      // Using PutObject with signature in URL
      uploadSuccess = await uploadWithPutObject(uploadUrl, file, onProgress);
    }
    
    if (!uploadSuccess) {
      throw new Error('Upload failed');
    }
    
    // 4. Return the accessible URL provided by the server
    return { url: accessUrl || constructPublicUrl(filename) };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Helper function for PostObject upload with progress tracking
async function uploadWithPostObject(
  url: string, 
  formData: Record<string, string>, 
  file: File, 
  onProgress?: (percent: number) => void
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Set up progress tracking
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(true);
      } else {
        try {
          // Parse XML error response
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xhr.responseText, "text/xml");
          const code = xmlDoc.getElementsByTagName("Code")[0]?.textContent || 'Unknown';
          const message = xmlDoc.getElementsByTagName("Message")[0]?.textContent || 'Unknown';
          reject(new Error(`OSS Error: ${code} - ${message}`));
        } catch (e) {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.open('POST', url, true);
    
    const formDataObj = new FormData();
    // Add all form fields from the server response
    Object.entries(formData).forEach(([key, value]) => {
      formDataObj.append(key, value);
    });
    
    // Add the file last (important for Aliyun OSS)
    formDataObj.append('file', file);
    
    xhr.send(formDataObj);
  });
}

// Helper function for PutObject upload with progress tracking
async function uploadWithPutObject(
  url: string, 
  file: File, 
  onProgress?: (percent: number) => void
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          onProgress(percent);
        }
      };
    }
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(true);
      } else {
        try {
          // Parse XML error response
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(xhr.responseText, "text/xml");
          const code = xmlDoc.getElementsByTagName("Code")[0]?.textContent || 'Unknown';
          const message = xmlDoc.getElementsByTagName("Message")[0]?.textContent || 'Unknown';
          reject(new Error(`OSS Error: ${code} - ${message}`));
        } catch (e) {
          reject(new Error(`Upload failed with status: ${xhr.status}`));
        }
      }
    };
    
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.open('PUT', url, true);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.send(file);
  });
}

// Helper function to construct public URL if not provided by the server
function constructPublicUrl(filename: string): string {
  const domain = process.env.NEXT_PUBLIC_OSS_CUSTOM_DOMAIN || 
                `${process.env.NEXT_PUBLIC_OSS_BUCKET}.${process.env.NEXT_PUBLIC_OSS_REGION}.aliyuncs.com`;
  return `https://${domain}/${encodeURIComponent(filename)}`;
}