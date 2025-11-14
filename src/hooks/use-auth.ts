"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebase";
import { useToast } from "./use-toast";

interface UseAuthResult {
  login: (email: string, password: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export function useAuth(): UseAuthResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function login(email: string, password: string): Promise<boolean> {
    setLoading(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login Successful", description: "Welcome back!" });
      return true;
    } catch (err: any) {
      const errorCode = err.code || "auth/unknown-error";
      setError(errorCode);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: err.message ?? "An unknown error occurred.",
      });
      return false;
    } finally {
      setLoading(false);
    }
  }

  return { login, loading, error };
}