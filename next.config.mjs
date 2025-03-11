/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: `${process.env.OSS_BUCKET}.${process.env.OSS_REGION}.aliyuncs.com`,
        pathname: "/uploads/**",
      },
    ],
  },
};

export default nextConfig;
