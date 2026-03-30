export interface PasswordExpiryInfo {
    isPasswordExpired: boolean;
    isPasswordNearExpiry: boolean;
    daysToExpire: number;
    passwordLastUpdatedAt: string;
    passwordExpiresAt: string;
    passwordExpiryDuration: number;
}
