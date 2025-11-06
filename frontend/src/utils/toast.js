import { toast } from 'sonner';

// Success toast
export const showSuccess = (message) => {
  toast.success(message, {
    duration: 3000,
    position: 'top-right',
  });
};

// Error toast
export const showError = (message) => {
  toast.error(message, {
    duration: 4000,
    position: 'top-right',
  });
};

// Info toast
export const showInfo = (message) => {
  toast.info(message, {
    duration: 3000,
    position: 'top-right',
  });
};

// Warning toast
export const showWarning = (message) => {
  toast.warning(message, {
    duration: 3500,
    position: 'top-right',
  });
};

// Loading toast (returns toast ID for dismissal)
export const showLoading = (message) => {
  return toast.loading(message, {
    position: 'top-right',
  });
};

// Dismiss specific toast
export const dismissToast = (toastId) => {
  toast.dismiss(toastId);
};

// Promise toast (for async operations)
export const showPromise = (promise, messages) => {
  return toast.promise(promise, {
    loading: messages.loading || 'Loading...',
    success: messages.success || 'Success!',
    error: messages.error || 'Error occurred',
    position: 'top-right',
  });
};
