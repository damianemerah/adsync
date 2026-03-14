"use client";

import { useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const supabase = createClient();
  useEffect(() => {
    // 1. Check active session on mount
    const checkUser = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        setSession(session);
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error checking session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    // 2. Set up the Real-time Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);

      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);

      // 3. Handle specific events
      if (event === "SIGNED_IN") {
        router.refresh(); // Reload Server Components to reflect login
        // router.push("/dashboard");
      }

      if (event === "SIGNED_OUT") {
        router.refresh(); // Clear data from Server Components
        router.push("/login"); // Force redirect
      }

      if (event === "TOKEN_REFRESHED") {
        // Just update the router to ensure cookies are fresh on server
        router.refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, supabase]);

  const signOut = async () => {
    queryClient.removeQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom Hook for ease of use
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
