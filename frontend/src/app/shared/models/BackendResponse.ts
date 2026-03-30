export interface ErrorResponse{
    success: false,
    message: string
}

export interface SuccessResponse{
    success: true,
    message: string
}

export type BackendResponse = SuccessResponse | ErrorResponse;
