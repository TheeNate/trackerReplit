import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";

export default function SuccessPage() {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    // Get token from URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      setToken(urlToken);
    }
  }, []);
  
  // Get verification details
  const { data, isLoading, isError } = useQuery({
    queryKey: [token ? `/api/verify/${token}` : null],
    enabled: !!token,
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load verification details",
        variant: "destructive",
      });
    },
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md p-8 text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Loading verification details...</p>
        </div>
      </div>
    );
  }
  
  if (isError || !token || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-semibold mb-2">Verification Error</h1>
          <p className="text-neutral-500">
            No verification details available. This may be an invalid link or the verification has expired.
          </p>
        </div>
      </div>
    );
  }
  
  const { entry, user } = data;
  
  // Format method for display
  let displayMethod = entry.method;
  if (displayMethod === 'UT_THK') {
    displayMethod = 'UT Thk.';
  }
  
  // Generate verification ID
  const verificationId = `VER-${new Date().getTime().toString().slice(-8)}-${token.slice(0, 5).toUpperCase()}`;
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        
        <h1 className="text-2xl font-semibold mb-2">Verification Complete</h1>
        <p className="text-neutral-500 mb-6">Thank you for verifying these OJT hours.</p>
        
        <div className="bg-neutral-100 rounded-md p-4 mb-6 text-left">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-neutral-500">Technician:</dt>
            <dd className="text-neutral-900 font-medium">{user.name}</dd>
            <dt className="text-neutral-500">Employee #:</dt>
            <dd className="text-neutral-900 font-medium">{user.employeeNumber}</dd>
            <dt className="text-neutral-500">Date:</dt>
            <dd className="text-neutral-900 font-medium">
              {new Date(entry.date).toLocaleDateString()}
            </dd>
            <dt className="text-neutral-500">Location:</dt>
            <dd className="text-neutral-900 font-medium">{entry.location}</dd>
            <dt className="text-neutral-500">Method:</dt>
            <dd className="text-neutral-900 font-medium">{displayMethod}</dd>
            <dt className="text-neutral-500">Hours:</dt>
            <dd className="text-neutral-900 font-medium">{entry.hours.toFixed(1)}</dd>
            <dt className="text-neutral-500">Verification ID:</dt>
            <dd className="text-neutral-900 font-medium">{verificationId}</dd>
          </dl>
        </div>
        
        <p className="text-sm text-neutral-500">This page can now be closed.</p>
      </div>
    </div>
  );
}
