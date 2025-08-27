import 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    provider?: string; // Add your custom properties here
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    provider?: string; // Add your custom properties here
  }
}