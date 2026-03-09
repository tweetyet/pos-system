"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { UserDB, type User } from "./db";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isOwner: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Seed default users
      await UserDB.seedDefaultUsers();

      // Check for stored session
      const storedUser = localStorage.getItem("pos_user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // Verify user still exists
          const dbUser = await UserDB.getById(parsedUser.id);
          if (dbUser) {
            setUser(dbUser);
          } else {
            localStorage.removeItem("pos_user");
          }
        } catch {
          localStorage.removeItem("pos_user");
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    const authenticatedUser = await UserDB.authenticate(username, password);
    if (authenticatedUser) {
      setUser(authenticatedUser);
      localStorage.setItem("pos_user", JSON.stringify(authenticatedUser));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("pos_user");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        isOwner: user?.role === "owner",
        isStaff: user?.role === "staff",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
