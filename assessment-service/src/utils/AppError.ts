export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details: unknown = null
  ) {
    super(message);
    this.name = 'AppError';
    // Restore prototype chain (needed for instanceof checks with ES5 targets)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
