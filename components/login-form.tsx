"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const success = await login(username, password);
    if (!success) {
      setError("Invalid username or password");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 relative h-24 w-24 overflow-hidden rounded-full border-2 border-primary shadow-lg shadow-primary/20">
            <Image
              src="/logo.jpg"
              alt="AEV Auto Logo"
              fill
              className="object-cover"
            />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            <span className="text-primary">AEV</span> Auto
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Film & Accessories - Point of Sale
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-foreground">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10 bg-input border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button 
              type="submit" 
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90" 
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="mt-6 rounded-lg bg-secondary border border-border p-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Demo Credentials:</p>
            <div className="space-y-1 text-sm text-foreground">
              <p><span className="font-medium text-primary">Owner:</span> owner / owner123</p>
              <p><span className="font-medium text-primary">Staff:</span> staff / staff123</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
