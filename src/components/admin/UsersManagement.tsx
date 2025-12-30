// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuthContext";

/**
 * UsersManagement
 * Roles: user | staff | manager | admin
 * Staff permissions  → staff_permissions
 * Manager permissions → manager_permissions
 * Manager → multiple staff assignment → manager_staff_map
 */

const VALID_ROLES = ["user", "staff", "manager", "admin"];

const PERMISSION_KEYS = [
  { key: "inventory", label: "Inventory" },
  { key: "billing", label: "Sales & Billing" },
  { key: "invoice_archive", label: "Invoice Archive" },
  { key: "customers", label: "Customers" },
];

export default function UsersManagement() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const [profiles, setProfiles] = useState([]);
  const [staff, setStaff] = useState([]);

  const [localRoles, setLocalRoles] = useState({});
  const [permissionsMap, setPermissionsMap] = useState({}); // staff permissions
  const [managerPermissionsMap, setManagerPermissionsMap] = useState({});
  const [managerStaffMap, setManagerStaffMap] = useState({});

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchAll();
  }, []);

  /* =====================================================
     FETCH ALL
  ===================================================== */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select(
          "id, full_name, email, phone, role, address_line_1, address_line_2, city, state, postal_code, created_at"
        )
        .order("created_at", { ascending: false });

      const { data: staffData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "staff");

      const { data: staffPerms } = await supabase
        .from("staff_permissions")
        .select("staff_id, permission_key, allowed");

      const { data: managerPerms } = await supabase
        .from("manager_permissions")
        .select("manager_id, permission_key, allowed");

      const { data: mapData } = await supabase
        .from("manager_staff_map")
        .select("manager_id, staff_id");

      const roleMap = {};
      profilesData?.forEach((p) => (roleMap[p.id] = p.role));

      const staffPermMap = {};
      staffPerms?.forEach((r) => {
        if (!staffPermMap[r.staff_id]) staffPermMap[r.staff_id] = {};
        staffPermMap[r.staff_id][r.permission_key] = !!r.allowed;
      });

      const mgrPermMap = {};
      managerPerms?.forEach((r) => {
        if (!mgrPermMap[r.manager_id]) mgrPermMap[r.manager_id] = {};
        mgrPermMap[r.manager_id][r.permission_key] = !!r.allowed;
      });

      const mgrStaffMap = {};
      mapData?.forEach((r) => {
        if (!mgrStaffMap[r.manager_id]) mgrStaffMap[r.manager_id] = [];
        mgrStaffMap[r.manager_id].push(r.staff_id);
      });

      setProfiles(profilesData || []);
      setStaff(staffData || []);
      setLocalRoles(roleMap);
      setPermissionsMap(staffPermMap);
      setManagerPermissionsMap(mgrPermMap);
      setManagerStaffMap(mgrStaffMap);
    } catch {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  /* =====================================================
     ROLE CHANGE
  ===================================================== */
  const saveRole = async (id) => {
    if (!isAdmin) return;

    const role = localRoles[id];
    if (!VALID_ROLES.includes(role)) return;
    if (!confirm(`Change role to "${role}"?`)) return;

    setSavingId(id);
    try {
      await supabase.from("profiles").update({ role }).eq("id", id);

      if (role !== "manager") {
        await supabase.from("manager_staff_map").delete().eq("manager_id", id);
        await supabase.from("manager_permissions").delete().eq("manager_id", id);
      }

      if (role !== "staff") {
        await supabase.from("staff_permissions").delete().eq("staff_id", id);
      }

      toast({ title: "Saved", description: "Role updated" });
      fetchAll();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setSavingId(null);
    }
  };

  /* =====================================================
     MANAGER → STAFF ASSIGNMENT
  ===================================================== */
  const toggleStaffForManager = async (managerId, staffId, checked) => {
    if (!isAdmin) return;

    if (checked) {
      await supabase.from("manager_staff_map").upsert({
        manager_id: managerId,
        staff_id: staffId,
      });
    } else {
      await supabase
        .from("manager_staff_map")
        .delete()
        .eq("manager_id", managerId)
        .eq("staff_id", staffId);
    }

    fetchAll();
  };

  /* =====================================================
     STAFF PERMISSIONS
  ===================================================== */
  const togglePermission = (staffId, key, checked) => {
    setPermissionsMap((p) => ({
      ...p,
      [staffId]: { ...(p[staffId] || {}), [key]: checked },
    }));
  };

  const savePermissions = async (staffId) => {
    if (!isAdmin) return;

    try {
      const perms = permissionsMap[staffId] || {};

      const upserts = Object.keys(perms)
        .filter((k) => perms[k])
        .map((k) => ({
          staff_id: staffId,
          permission_key: k,
          allowed: true,
        }));

      if (upserts.length) {
        await supabase.from("staff_permissions").upsert(upserts, {
          onConflict: ["staff_id", "permission_key"],
        });
      }

      await supabase
        .from("staff_permissions")
        .delete()
        .eq("staff_id", staffId)
        .in(
          "permission_key",
          PERMISSION_KEYS.map((k) => k.key).filter((k) => !perms[k])
        );

      toast({ title: "Saved", description: "Staff permissions updated" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save permissions",
        variant: "destructive",
      });
    }
  };

  /* =====================================================
     MANAGER PERMISSIONS
  ===================================================== */
  const toggleManagerPermission = (managerId, key, checked) => {
    setManagerPermissionsMap((p) => ({
      ...p,
      [managerId]: { ...(p[managerId] || {}), [key]: checked },
    }));
  };

  const saveManagerPermissions = async (managerId) => {
    if (!isAdmin) return;

    try {
      const perms = managerPermissionsMap[managerId] || {};

      const upserts = Object.keys(perms)
        .filter((k) => perms[k])
        .map((k) => ({
          manager_id: managerId,
          permission_key: k,
          allowed: true,
        }));

      if (upserts.length) {
        await supabase.from("manager_permissions").upsert(upserts, {
          onConflict: ["manager_id", "permission_key"],
        });
      }

      await supabase
        .from("manager_permissions")
        .delete()
        .eq("manager_id", managerId)
        .in(
          "permission_key",
          PERMISSION_KEYS.map((k) => k.key).filter((k) => !perms[k])
        );

      toast({ title: "Saved", description: "Manager permissions updated" });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save manager permissions",
        variant: "destructive",
      });
    }
  };

  /* =====================================================
     RENDER
  ===================================================== */
  return (
    <div className="p-4 bg-white rounded shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Users Management</h2>

      {loading ? (
        <div>Loading…</div>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Managed Staff</th>
              <th>Permissions</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {profiles.map((p) => {
              const role = localRoles[p.id];
              const managedStaff = managerStaffMap[p.id] || [];
              const staffPerms = permissionsMap[p.id] || {};
              const mgrPerms = managerPermissionsMap[p.id] || {};

              return (
                <tr key={p.id} className="border-t">
                  <td>{p.full_name || "—"}</td>
                  <td>{p.email || "—"}</td>

                  <td>
                    <select
                      value={role}
                      onChange={(e) =>
                        setLocalRoles((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      disabled={!isAdmin}
                    >
                      {VALID_ROLES.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  </td>

                  <td>
                    {role === "manager" ? (
                      staff.map((s) => (
                        <label key={s.id} className="block text-xs">
                          <input
                            type="checkbox"
                            checked={managedStaff.includes(s.id)}
                            onChange={(e) =>
                              toggleStaffForManager(
                                p.id,
                                s.id,
                                e.target.checked
                              )
                            }
                          />{" "}
                          {s.full_name}
                        </label>
                      ))
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    {role === "staff" &&
                      PERMISSION_KEYS.map((k) => (
                        <label key={k.key} className="block text-xs">
                          <input
                            type="checkbox"
                            checked={!!staffPerms[k.key]}
                            onChange={(e) =>
                              togglePermission(
                                p.id,
                                k.key,
                                e.target.checked
                              )
                            }
                          />{" "}
                          {k.label}
                        </label>
                      ))}

                    {role === "manager" &&
                      PERMISSION_KEYS.map((k) => (
                        <label key={k.key} className="block text-xs">
                          <input
                            type="checkbox"
                            checked={!!mgrPerms[k.key]}
                            onChange={(e) =>
                              toggleManagerPermission(
                                p.id,
                                k.key,
                                e.target.checked
                              )
                            }
                          />{" "}
                          {k.label}
                        </label>
                      ))}

                    {role === "staff" && (
                      <Button
                        size="sm"
                        className="mt-1"
                        onClick={() => savePermissions(p.id)}
                      >
                        Save
                      </Button>
                    )}

                    {role === "manager" && (
                      <Button
                        size="sm"
                        className="mt-1"
                        onClick={() => saveManagerPermissions(p.id)}
                      >
                        Save
                      </Button>
                    )}
                  </td>

                  <td>
                    <Button
                      size="sm"
                      disabled={savingId === p.id}
                      onClick={() => saveRole(p.id)}
                    >
                      Save Role
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
