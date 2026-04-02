import { ErrorResponse } from "../../../shared/models/BackendResponse";

export interface LoginSuccessResponse {
    success: true;
    message: string;
}

export type LoginResponse = LoginSuccessResponse | ErrorResponse;
