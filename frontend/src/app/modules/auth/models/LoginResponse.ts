import { ErrorResponse } from "../../../shared/models/BackendResponse";

export interface LoginSuccessResponse {
    success: true;
    message: string;
    isAdmin?: boolean;
    passwordLastUpdatedAt?: string;
    expiryDays?: number;
}

export type LoginResponse = LoginSuccessResponse | ErrorResponse;
