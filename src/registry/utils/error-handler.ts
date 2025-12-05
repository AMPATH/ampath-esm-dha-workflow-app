import { type AmrsErrorResponse } from '../types';

export function generateErrorMessage(error: any): string[] {
  const errors: string[] = [];
  return errors;
}

export function getErrorMessages(error: AmrsErrorResponse) {
  const errors = [];
  if (error && error.error) {
    if (error.error.error) {
      const globalErrors = error.error.error.globalErrors || null;
      if (globalErrors) {
        for (const err of globalErrors) {
          errors.push(err.message);
        }
      }
    } else if (error.error) {
      if (error.error['globalErrors']) {
        const globalErrors = error.error['globalErrors'] || null;
        if (globalErrors) {
          for (const err of globalErrors) {
            errors.push(err.message);
          }
        }
      } else if (error.error['message']) {
        errors.push(error.error['message']);
      }
    } else {
      errors.push(
        error.error.error.message ||
          'An error occurred while creating the patient. Please try again or contact support',
      );
    }
  }
  return errors;
}
