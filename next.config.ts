import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // webpack: (config, { isServer }) => {
  //   // Monaco editor uses web workers. For Next.js, ensure they are handled correctly.
  //   // `@monaco-editor/react` usually attempts to configure this automatically.
  //   // If you encounter issues with workers, you might need to add specific rules.
  //   // For now, relying on the library's default behavior.
  //   return config;
  // }
};

export default nextConfig;
