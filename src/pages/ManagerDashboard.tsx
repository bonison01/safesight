"use client";

import { useAuth } from "@/hooks/useAuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Package,
  Receipt,
  ClipboardList,
  Users,
  LogOut,
} from "lucide-react";

export default function ManagerDashboard() {
  const {
    user,
    isManager,
    isAdmin,
    loading,
    profileLoading,
    signOut,
  } = useAuth();

  const navigate = useNavigate();

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});
  const [loadingPerms, setLoadingPerms] = useState(true);

  /* =====================================================
     AUTH GUARD
  ===================================================== */
  useEffect(() => {
    if (loading || profileLoading) return;

    if (!(isManager || isAdmin)) {
      navigate("/auth");
    }
  }, [loading, profileLoading, isManager, isAdmin, navigate]);

  /* =====================================================
     LOAD MANAGER PERMISSIONS (TS SAFE)
  ===================================================== */
  useEffect(() => {
    if (loading || profileLoading) return;

    // ADMIN → full access
    if (isAdmin) {
      setPermissions({
        inventory: true,
        billing: true,
        invoice_archive: true,
        customers: true,
      });
      setLoadingPerms(false);
      return;
    }

    // Not manager or user not ready
    if (!isManager || !user?.id) {
      setPermissions({});
      setLoadingPerms(false);
      return;
    }

    const loadPermissions = async () => {
      try {
        const { data, error } = await supabase
          .from("manager_permissions" as any) // ✅ FIX
          .select("permission_key, allowed")
          .eq("manager_id", user.id);

        if (error) throw error;

        const map: Record<string, boolean> = {};
        (data || []).forEach((row: any) => {
          map[row.permission_key] = !!row.allowed;
        });

        setPermissions(map);
      } catch (err) {
        console.error("Failed to load manager permissions", err);
        setPermissions({});
      } finally {
        setLoadingPerms(false);
      }
    };

    loadPermissions();
  }, [
    loading,
    profileLoading,
    isAdmin,
    isManager,
    user?.id,
  ]);

  /* =====================================================
     LOADING
  ===================================================== */
  if (loading || profileLoading || loadingPerms) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  const can = (key: string) => isAdmin || !!permissions[key];

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Card className="max-w-3xl mx-auto shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            Manager Dashboard
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {!isAdmin && Object.keys(permissions).length === 0 && (
            <p className="text-sm text-gray-500">
              No permissions assigned to your account.
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {can("inventory") && (
              <Button onClick={() => navigate("/admin?tab=inventory")}>
                <Package className="h-5 w-5 mr-2" />
                Inventory
              </Button>
            )}

            {can("billing") && (
              <Button onClick={() => navigate("/admin?tab=sales")}>
                <Receipt className="h-5 w-5 mr-2" />
                Sales & Billing
              </Button>
            )}

            {can("invoice_archive") && (
              <Button onClick={() => navigate("/admin?tab=invoice-list")}>
                <ClipboardList className="h-5 w-5 mr-2" />
                Invoice Archive
              </Button>
            )}

            {can("customers") && (
              <Button onClick={() => navigate("/admin?tab=customers")}>
                <Users className="h-5 w-5 mr-2" />
                Customers
              </Button>
            )}
          </div>

          <div className="pt-4 border-t">
            <Button variant="destructive" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
