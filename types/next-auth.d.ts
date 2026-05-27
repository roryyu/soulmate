import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      phone: string | null
      isImpersonating?: boolean
      impersonatedBy?: {
        id: string
        name?: string | null
        email?: string | null
      }
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: string
    phone: string | null
    isImpersonating?: boolean
    impersonatedBy?: {
      id: string
      name?: string | null
      email?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    phone: string | null
    isImpersonating?: boolean
    impersonatedBy?: {
      id: string
      name?: string | null
      email?: string | null
    }
  }
}
