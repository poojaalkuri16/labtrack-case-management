"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createCase } from "@/lib/cases";
import { resetDemoData } from "@/lib/db";
import { retryNotification } from "@/lib/notify";
import { setDueDate, setStatus } from "@/lib/workflow";

/** Only allow same-site relative paths as redirect targets. */
function safeReturn(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "/";
  return s.startsWith("/") && !s.startsWith("//") ? s.split("?")[0] : "/";
}

function withParams(path: string, params: Record<string, string>, keep: FormDataEntryValue | null) {
  const q = new URLSearchParams(typeof keep === "string" ? keep : "");
  ["n", "ref", "s", "err"].forEach((k) => q.delete(k));
  Object.entries(params).forEach(([k, v]) => q.set(k, v));
  return `${path}?${q.toString()}`;
}

export async function changeStatus(formData: FormData) {
  const back = safeReturn(formData.get("returnTo"));
  const keep = formData.get("returnQuery");
  let target: string;
  try {
    const r = await setStatus(String(formData.get("id")), String(formData.get("status")));
    target = withParams(back, { n: r.notify ?? "moved", ref: r.ref, s: r.label }, keep);
  } catch (e) {
    target = withParams(back, { err: e instanceof Error ? e.message : "Something went wrong." }, keep);
  }
  revalidatePath("/");
  revalidatePath("/outbox");
  redirect(target);
}

export async function changeDueDate(formData: FormData) {
  const back = safeReturn(formData.get("returnTo"));
  const keep = formData.get("returnQuery");
  let target: string;
  try {
    await setDueDate(String(formData.get("id")), String(formData.get("due_date")));
    target = withParams(back, { n: "due", ref: String(formData.get("ref") ?? "") }, keep);
  } catch (e) {
    target = withParams(back, { err: e instanceof Error ? e.message : "Something went wrong." }, keep);
  }
  revalidatePath("/");
  redirect(target);
}

export async function retryEmail(formData: FormData) {
  const outcome = await retryNotification(String(formData.get("id")));
  revalidatePath("/outbox");
  redirect(`/outbox?n=${outcome}`);
}

export async function addCase(formData: FormData) {
  let target: string;
  try {
    const ref = await createCase({
      clinicId: String(formData.get("clinic")),
      type: String(formData.get("type") ?? ""),
      patientRef: String(formData.get("patient") ?? ""),
      dueDate: String(formData.get("due_date") ?? ""),
    });
    target = `/?n=created&ref=${encodeURIComponent(ref)}`;
  } catch (e) {
    target = `/cases/new?err=${encodeURIComponent(e instanceof Error ? e.message : "Could not create the case.")}`;
  }
  revalidatePath("/");
  redirect(target);
}

/** Wipes and reseeds the sample data. Switch it off for a real deployment with DEMO_RESET=off. */
export async function resetDemo() {
  if (process.env.DEMO_RESET === "off") redirect("/?err=" + encodeURIComponent("Demo reset is switched off."));
  await resetDemoData();
  revalidatePath("/");
  revalidatePath("/outbox");
  redirect("/?n=reset");
}
