'use client';

import { Button } from '@/components/ui/button';

type Props = {
  message?: string;
  onRetry?: () => void;
};

export default function ApiErrorState({ message, onRetry }: Props) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-medium text-red-800">
        {message || 'Could not load data from the API.'}
      </p>
      {onRetry && (
        <Button type="button" variant="outline" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
