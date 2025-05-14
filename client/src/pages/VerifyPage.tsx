import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { verificationFormSchema, type VerificationFormValues } from "@/types";

export default function VerifyPage() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isVerifying, setIsVerifying] = useState(false);
  
  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationFormSchema),
    defaultValues: {
      verifierName: "",
    },
  });
  
  // Query verification details
  const { data, isLoading, isError, error } = useQuery({
    queryKey: [`/api/verify/${token}`],
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load verification details",
        variant: "destructive",
      });
    },
  });
  
  const handleSubmit = async (values: VerificationFormValues) => {
    setIsVerifying(true);
    
    try {
      const response = await fetch(`/api/verify/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Verification failed");
      }
      
      // Show success message and redirect to success page
      toast({
        title: "Verification successful",
        description: "Thank you for verifying these OJT hours.",
      });
      
      // Redirect to success page with data
      setLocation(`/success?token=${token}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Verification failed",
        description: error instanceof Error ? error.message : "An error occurred during verification",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
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
  
  if (isError || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md text-center">
          <h1 className="text-2xl font-semibold mb-2">Verification Failed</h1>
          <p className="text-neutral-500">
            {error instanceof Error ? error.message : "This entry may have already been verified or the link is invalid."}
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
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold mb-2">OJT Hours Verification</h1>
          <p className="text-neutral-500">Please verify the OJT hours for the technician</p>
        </div>
        
        <div className="bg-neutral-100 rounded-md p-4 mb-6">
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
          </dl>
        </div>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="verifierName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name (Supervisor)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter your full name" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isVerifying}
              variant="secondary"
            >
              {isVerifying ? "Verifying..." : "Verify Hours"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
