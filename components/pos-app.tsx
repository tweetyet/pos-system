"use client";

import { useEffect, useState } from "react";
import { useAuth, AuthProvider } from "@/lib/auth-context";
import { initDB, seedSampleProducts } from "@/lib/db";
import { LoginForm } from "./login-form";
import { POSLayout } from "./pos-layout";

function POSContent() {
  const { user, isLoading } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await initDB();
      await seedSampleProducts();
      setIsInitialized(true);
    };
    init();
  }, []);

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          <p className="text-muted-foreground">Initializing POS System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return <POSLayout />;
}

export function POSApp() {
  return (
    <AuthProvider>
      <POSContent />
    </AuthProvider>
  );
}
