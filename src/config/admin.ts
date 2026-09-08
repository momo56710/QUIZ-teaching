

// Admin user type
export interface AdminUser {
  isAdmin: boolean;
  timestamp: number;
}

// The only Google account allowed to hold admin access
export const ADMIN_EMAIL = 'mohamedmouh567@gmail.com';

// Check whether a signed-in user's email is the designated admin account
export const isAdminEmail = (email?: string | null): boolean => {
  return !!email && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
};

// Check if user is admin. Requires both the secret key AND that the
// currently signed-in Google account is the designated admin email, so
// knowing the secret alone is no longer enough to gain admin access.
export const checkAdminAccess = (secret: string, email?: string | null): boolean => {
  return isAdminEmail(email) && secret === import.meta.env.VITE_ADMIN_SECRET;
}; 