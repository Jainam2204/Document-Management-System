import { ErrorResponse } from "../../../shared/models/BackendResponse";

export interface ChangePasswordSuccessResponse {
    success: true;
    message: string;
    passwordLastUpdatedAt?: string;
    expiryDays?: number;
}

export type ChangePasswordResponse = ChangePasswordSuccessResponse | ErrorResponse;
