import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { FileSpreadsheet } from "lucide-react";
import { generatePdf } from "@/lib/pdf";

interface ProfileHeaderProps {
  user: Partial<User>;
  verifiedEntries: any[];
}

export function ProfileHeader({ user, verifiedEntries }: ProfileHeaderProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setLocation("/");
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleExportPdf = async () => {
    if (verifiedEntries.length === 0) {
      toast({
        title: "No verified entries",
        description: "You need at least one verified entry to export as PDF.",
        variant: "destructive",
      });
      return;
    }
    
    setIsExporting(true);
    
    try {
      await generatePdf(verifiedEntries, user);
      toast({
        title: "PDF exported",
        description: "Your verified hours have been exported as PDF.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to export PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <>
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold text-neutral-900">OJT Hours Tracker</h1>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-neutral-500">{user.email}</span>
            <button 
              onClick={handleLogout}
              className="text-sm text-primary hover:text-primary/80 focus:outline-none"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900">{user.name || 'New User'}</h2>
              {user.employeeNumber && (
                <p className="text-sm text-neutral-500">Employee #: {user.employeeNumber}</p>
              )}
            </div>
            
            <div className="mt-4 sm:mt-0">
              <Button 
                variant="outline" 
                onClick={handleExportPdf}
                disabled={isExporting || verifiedEntries.length === 0}
                className="inline-flex items-center"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                {isExporting ? "Exporting..." : "Export Verified Hours as PDF"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
