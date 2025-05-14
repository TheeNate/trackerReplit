import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Entry, Supervisor } from "@shared/schema";
import { supervisorFormSchema, type SupervisorFormValues } from "@/types";

interface SupervisorVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  entry: Entry | null;
}

export function SupervisorVerifyModal({ isOpen, onClose, onSuccess, entry }: SupervisorVerifyModalProps) {
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>("");
  const { toast } = useToast();
  
  const form = useForm<SupervisorFormValues>({
    resolver: zodResolver(supervisorFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      certificationLevel: "Level I",
      company: "",
    },
  });
  
  // Load supervisors when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSupervisors();
    }
  }, [isOpen]);
  
  const loadSupervisors = async () => {
    try {
      const response = await fetch("/api/supervisors", {
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setSupervisors(data);
      }
    } catch (error) {
      console.error(error);
    }
  };
  
  // Handle supervisor selection
  const handleSupervisorChange = (value: string) => {
    setSelectedSupervisor(value);
    
    if (value) {
      // Find selected supervisor and populate form
      const supervisor = supervisors.find((s) => s.id.toString() === value);
      if (supervisor) {
        form.setValue("name", supervisor.name);
        form.setValue("email", supervisor.email);
        form.setValue("phone", supervisor.phone);
        form.setValue("certificationLevel", supervisor.certificationLevel as any);
        form.setValue("company", supervisor.company);
      }
    } else {
      // Clear form when "new supervisor" is selected
      form.reset();
    }
  };
  
  const handleSubmit = async (values: SupervisorFormValues) => {
    if (!entry) return;
    
    setIsLoading(true);
    
    try {
      // Submit verification request
      const requestData = selectedSupervisor 
        ? { supervisorId: parseInt(selectedSupervisor) }
        : values;
      
      await apiRequest("POST", `/api/verify-request/${entry.id}`, requestData);
      
      // Show success message
      toast({
        title: "Verification request sent",
        description: "An email has been sent to the supervisor for verification.",
      });
      
      // Close modal and notify parent component
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to send verification request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format entry details for display
  const formatEntryDetails = () => {
    if (!entry) return null;
    
    // Format method for display
    let displayMethod = entry.method;
    if (displayMethod === 'UT_THK') {
      displayMethod = 'UT Thk.';
    }
    
    return (
      <div className="bg-neutral-100 rounded-md p-4 mb-4">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
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
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Supervisor Verification</DialogTitle>
          <DialogDescription>
            Please provide supervisor information to verify the following hours:
          </DialogDescription>
        </DialogHeader>
        
        {formatEntryDetails()}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="mb-4">
              <FormLabel>Select Saved Supervisor</FormLabel>
              <Select
                value={selectedSupervisor}
                onValueChange={handleSupervisorChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select or enter new supervisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Enter new supervisor</SelectItem>
                  {supervisors.map((supervisor) => (
                    <SelectItem key={supervisor.id} value={supervisor.id.toString()}>
                      {supervisor.name} ({supervisor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supervisor Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supervisor Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supervisor Phone</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="certificationLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certification Level</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select certification level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Level I">Level I</SelectItem>
                        <SelectItem value="Level II">Level II</SelectItem>
                        <SelectItem value="Level III">Level III</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send for Verification"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
