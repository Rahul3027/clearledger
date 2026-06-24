"use client";

import { useEffect } from "react";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-full flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-gray-200 m-6">
      <div className="rounded-full bg-red-100 p-3 mb-4">
        <AlertTriangle className="h-6 w-6 text-red-600" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 mb-2">Error loading case</h2>
      <p className="text-gray-500 mb-6 max-w-md">
        We encountered a problem retrieving the exception details. The case may have been deleted or you may not have permission to view it.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} variant="outline">
          Try again
        </Button>
        <Link href="/exceptions">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Queue
          </Button>
        </Link>
      </div>
    </div>
  );
}
