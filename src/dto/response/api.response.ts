export class ApiResponse<T> {
  success!: boolean;
  message?: string;
  data?: T;
  error?: string;
  count?: number;

  static success<T>(data: T, message?: string, count?: number): ApiResponse<T> {
    const response = new ApiResponse<T>();
    response.success = true;
    response.data = data;
    if (message) response.message = message;
    if (count !== undefined) response.count = count;
    return response;
  }

  static error(message: string, error?: string): ApiResponse<null> {
    const response = new ApiResponse<null>();
    response.success = false;
    response.message = message;
    if (error) response.error = error;
    return response;
  }
}
