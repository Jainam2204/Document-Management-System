import { ErrorResponse } from "../../../shared/models/BackendResponse";

export interface VerifySuccessResponse {
    success: true;
    message: string;
    isAdmin?: boolean;
    passwordLastUpdatedAt?: string;
    expiryDays?: number;
}

export type VerifyResponse = VerifySuccessResponse | ErrorResponse;
