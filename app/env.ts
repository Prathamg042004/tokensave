function getEnv(key: string, required: boolean = true): string {
    const value = process.env[key];
    if (required && !value) {
      console.warn(`Warning: Environment variable ${key} is not set`);
      return "";
    }
    return value || "";
  }
  
  export const env = {
    supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    redisUrl: getEnv("UPSTASH_REDIS_REST_URL"),
    redisToken: getEnv("UPSTASH_REDIS_REST_TOKEN"),
    isProduction: process.env.NODE_ENV === "production",
    version: "3.0.0",
  };