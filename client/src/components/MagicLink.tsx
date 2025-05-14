import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest } from "@/lib/queryClient";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { loginFormSchema, type LoginFormValues } from "@/types";

export function MagicLink() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const handleSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      await apiRequest("POST", "/api/auth/request-magic-link", values);
      setIsSent(true);
      toast({
        title: "Magic link sent!",
        description: "Check your email and click the link to log in.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to send magic link. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold mb-2">OJT Hours Tracker</h1>
        <p className="text-muted-foreground">Log in to access your OJT hours log</p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="your.email@example.com" 
                    type="email" 
                    autoComplete="email"
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
            disabled={isLoading}
          >
            {isLoading ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>
      </Form>
      
      {isSent && (
        <div className="mt-6">
          <div className="bg-muted p-4 rounded-md">
            <p className="text-center text-sm text-muted-foreground">
              Magic link sent! Check your email and click the link to log in.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
