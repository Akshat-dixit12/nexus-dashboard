'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken } from "@/lib/auth";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', color: '#fff', fontFamily: 'sans-serif' }}>
      Redirecting...
    </div>
  );
}
