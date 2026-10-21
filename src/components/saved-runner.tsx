"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { profileLabel } from "@/lib/format";
import type { RunnerProfile } from "@/lib/types";
import { RunnerFields } from "./runner-fields";

/**
 * A runner's fields with a choice of saved runners to start from, and a tick to save a newly typed runner for next
 * time. Picking a saved runner refills the fields; its ID number stays on the server.
 */
export function SavedRunnerFields({
  prefix,
  err,
  profiles,
  initial,
}: {
  prefix: string;
  err: (name: string) => string | undefined;
  profiles: RunnerProfile[];
  /** The saved runner picked to begin with, if any. */
  initial?: string;
}) {
  const [picked, setPicked] = useState(initial ?? "");
  const saved = profiles.find((p) => p.id === picked);
  return (
    <div className="flex flex-col gap-3">
      {profiles.length > 0 && (
        <label className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">ใช้ข้อมูลผู้วิ่งที่บันทึกไว้</span>
          <select value={picked} onChange={(e) => setPicked(e.target.value)} className={inputClass} aria-label="ใช้ข้อมูลผู้วิ่งที่บันทึกไว้">
            <option value="">กรอกเอง</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {profileLabel(p)}
              </option>
            ))}
          </select>
        </label>
      )}
      {/* A new key remounts the fields so their starting values follow the runner picked. */}
      <RunnerFields key={picked || "new"} prefix={prefix} err={err} saved={saved} />
      {!saved && (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input type="checkbox" name={`${prefix}.saveProfile`} value="1" className="h-5 w-5 flex-none accent-brand" />
          บันทึกผู้วิ่งคนนี้ไว้ใช้ครั้งหน้า (เก็บแบบเข้ารหัส ลบได้ทุกเมื่อ)
        </label>
      )}
    </div>
  );
}
