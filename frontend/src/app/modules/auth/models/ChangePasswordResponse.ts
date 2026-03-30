import { ErrorResponse } from "../../../shared/models/BackendResponse";
import { PasswordExpiryInfo } from "./PasswordExpiryInfo";

export interface ChangePasswordSuccessResponse {
    success: true;
    message: string;
    passwordExpiry?: PasswordExpiryInfo;
}

export type ChangePasswordResponse = ChangePasswordSuccessResponse | ErrorResponse;
