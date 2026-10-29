import React from 'react';

export const ErrorAlert = ({ message, errors, onClose }) => {
  if (!message && (!errors || errors.length === 0)) return null;

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2">
          <span className="font-semibold text-rose-700">Error:</span>
          <span>{message}</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-rose-500 hover:text-rose-700 font-bold ml-2 leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>

      {Array.isArray(errors) && errors.length > 0 && (
        <ul className="mt-2 list-disc list-inside space-y-1 text-xs text-rose-700 pl-2">
          {errors.map((err, idx) => (
            <li key={idx}>{err}</li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default ErrorAlert;
