export function classifySupabaseError(error: {
  code?: string;
  message?: string;
}) {
  switch (error.code) {
    case "23505": // Unique constraint violation
      return {
        status: 409,
        message: "This value already exists. Please choose a different one.",
      };
    case "23503": // Foreign key violation
      return { status: 400, message: "Referenced record not found." };
    case "23502": // Not null constraint
      return { status: 400, message: "A required field is missing." };
    case "23514": // Check constraint
      return {
        status: 400,
        message: "The value provided doesn't meet the requirements.",
      };
    case "42P01": // Undefined table (migration not run)
      return {
        status: 500,
        message: "Database configuration error. Contact support.",
      };
    case "PGRST301": // JWT expired
      return {
        status: 401,
        message: "Your session has expired. Please sign in again.",
      };
    case "PGRST116": // Row not found (single() with no results)
      return { status: 404, message: "Not found." };
    default:
      return { status: 500, message: "A database error occurred." };
  }
}
