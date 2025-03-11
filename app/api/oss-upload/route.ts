import { NextResponse } from 'next/server';
import OSS from 'ali-oss';


async function generateSignatureUrl(filename: string, contentType: string) {
    const client = new OSS({
        accessKeyId: process.env.OSS_ACCESS_KEY!,
        accessKeySecret: process.env.OSS_ACCESS_SECRET!,
        bucket: process.env.OSS_BUCKET!,
        region: process.env.OSS_REGION!,
        authorizationV4: true
    });
    return await client.signatureUrlV4('PUT', 3600, {
        headers: {
            'Content-Type': contentType
        }
    }, filename);
}

export async function POST(request: Request) {
    const { filename, contentType } = await request.json();
    console.log('POST', filename, contentType);
    const url = await generateSignatureUrl(filename, contentType);
    console.log(url);
    return NextResponse.json({ url });
} 


