import { ErrorResponse } from "../../../shared/models/BackendResponse";

export interface PasswordExpiryInfo {
    isPasswordExpired: boolean;
    isPasswordNearExpiry: boolean;
    daysToExpire: number;
    passwordLastUpdatedAt: string;
    passwordExpiresAt: string;
    passwordExpiryDuration: number;
}

export interface LoginSuccessResponse {
    success: true;
    message: string;
    passwordExpiry?: PasswordExpiryInfo;
}

export type LoginResponse = LoginSuccessResponse | ErrorResponse;
