/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  // thêm các biến env khác của bạn ở đây nếu cần
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
