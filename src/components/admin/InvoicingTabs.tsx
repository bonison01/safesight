// src/components/admin/InvoicingTabs.tsx
// @ts-nocheck
"use client";

import React, { useEffect, useState } from "react";
import Invoicing from "./Invoicing";

const STORAGE_KEY = "multi_invoice_tabs_v2";

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */
const makeId = () =>
  "inv_" + Date.now() + "_" + Math.floor(Math.random() * 1000);

/* =======================================================
   COMPONENT
======================================================= */
const InvoicingTabs: React.FC = () => {
  const [tabs, setTabs] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  /* -------------------------------------------------------
     LOAD SAVED TABS
  ------------------------------------------------------- */
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);

        if (
          Array.isArray(parsed.tabs) &&
          parsed.tabs.length > 0 &&
          parsed.tabs.every((t) => t.id)
        ) {
          setTabs(parsed.tabs);
          setActiveId(parsed.activeId || parsed.tabs[0].id);
          return;
        }
      }
    } catch (err) {
      console.error("Failed to restore invoice tabs", err);
    }

    // Fallback: create initial tab
    const id = makeId();
    const initial = [{ id, label: "New Invoice" }];
    setTabs(initial);
    setActiveId(id);

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs: initial, activeId: id })
      );
    } catch {}
  }, []);

  /* -------------------------------------------------------
     PERSIST STATE
  ------------------------------------------------------- */
  const persist = (nextTabs: any[], nextActive: string) => {
    setTabs(nextTabs);
    setActiveId(nextActive);

    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ tabs: nextTabs, activeId: nextActive })
      );
    } catch (err) {
      console.error("Failed to persist invoice tabs", err);
    }
  };

  /* -------------------------------------------------------
     ADD NEW TAB
  ------------------------------------------------------- */
  const addNewInvoice = () => {
    const id = makeId();

    // Ensure no stale draft exists
    try {
      sessionStorage.removeItem(`invoice_draft_${id}`);
    } catch {}

    const next = [...tabs, { id, label: "New Invoice" }];
    persist(next, id);
  };

  /* -------------------------------------------------------
     REMOVE TAB (FIXED STORAGE KEY)
  ------------------------------------------------------- */
  const removeInvoice = (id: string) => {
    if (tabs.length === 1) {
      alert("At least 1 invoice must remain open.");
      return;
    }

    const nextTabs = tabs.filter((t) => t.id !== id);
    const nextActive = nextTabs[0].id;

    // ✅ FIX: correct draft key
    try {
      sessionStorage.removeItem(`invoice_draft_${id}`);
    } catch {}

    persist(nextTabs, nextActive);
  };

  /* -------------------------------------------------------
     UPDATE TAB LABEL
  ------------------------------------------------------- */
  const updateTabLabel = (id: string, label?: string) => {
    const next = tabs.map((t) =>
      t.id === id
        ? { ...t, label: label?.trim() || "New Invoice" }
        : t
    );

    persist(next, activeId);
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */
  return (
    <div className="space-y-4">
      {/* TAB BAR */}
      <div className="flex gap-2 mb-2 items-center flex-wrap">
        {tabs.map((t) => (
          <div
            key={t.id}
            onClick={() => setActiveId(t.id)}
            className={`px-3 py-2 rounded-t cursor-pointer whitespace-nowrap flex items-center gap-2 ${
              activeId === t.id
                ? "bg-white border border-b-0 font-semibold"
                : "bg-gray-200"
            }`}
          >
            <span>{t.label}</span>

            <button
              title="Close tab"
              onClick={(e) => {
                e.stopPropagation();
                removeInvoice(t.id);
              }}
              className="text-red-500 text-xs"
            >
              ×
            </button>
          </div>
        ))}

        <button
          onClick={addNewInvoice}
          className="ml-2 px-3 py-2 bg-green-600 text-white rounded"
        >
          + New Invoice
        </button>
      </div>

      {/* ACTIVE INVOICE */}
      <div className="bg-white border rounded p-4">
        {activeId && (
          <Invoicing
            invoiceSessionId={activeId}
            onCustomerNameChange={(name) =>
              updateTabLabel(activeId, name)
            }
          />
        )}
      </div>
    </div>
  );
};

export default InvoicingTabs;
