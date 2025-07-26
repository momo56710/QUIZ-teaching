

// Admin user type
export interface AdminUser {
  isAdmin: boolean;
  timestamp: number;
}

// Check if user is admin
export const checkAdminAccess = (secret: string): boolean => {
  // For now, use a hardcoded secret. In production, use environment variable
  return secret === import.meta.env.VITE_ADMIN_SECRET;
}; 