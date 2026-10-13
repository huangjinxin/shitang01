"use server";

import { revalidatePath } from "next/cache";
import { config } from "../config";
import { getCategory } from "./registry";
import { createRecord, deleteRecord, updateRecord, type MutateResult } from "./service";
import { getMenu } from "../repository";

export async function getMenuPrefillAction(
  menuId: string,
): Promise<{ dishesText: string; ingredientsText: string } | null> {
  const menu = await getMenu(menuId);
  if (!menu) return null;
  const dishes: string[] = [];
  const ingredients: string[] = [];
  for (const day of menu.days) {
    for (const slot of day.slots) {
      for (const dish of slot.dishes) {
        dishes.push(`${day.date} ${slot.mealPeriodName}：${dish.name}`);
        for (const line of dish.ingredients) {
          ingredients.push(`${dish.name}｜${line.rawName} ${line.quantity ?? "?"}${line.unitName ?? ""}`);
        }
      }
    }
  }
  return { dishesText: dishes.join("\n"), ingredientsText: ingredients.join("\n") };
}

function formToInput(categoryKey: string, formData: FormData): Record<string, unknown> {
  const cat = getCategory(categoryKey)!;
  const input: Record<string, unknown> = {};
  for (const field of cat.fields) {
    const raw = formData.get(field.name);
    input[field.name] = raw === null ? undefined : raw.toString();
  }
  return input;
}

function revalidateAll(categoryKey: string) {
  revalidatePath("/records");
  revalidatePath(`/records/${categoryKey}`);
  revalidatePath("/");
}

export async function saveRecordAction(
  categoryKey: string,
  id: string | null,
  formData: FormData,
): Promise<MutateResult> {
  const cat = getCategory(categoryKey);
  if (!cat) return { ok: false, message: "未知的记录类别" };
  const input = formToInput(categoryKey, formData);
  const res = id
    ? await updateRecord(categoryKey, id, input, config.defaultActor)
    : await createRecord(categoryKey, input, config.defaultActor);
  if (res.ok) revalidateAll(categoryKey);
  return res;
}

export async function deleteRecordAction(categoryKey: string, id: string): Promise<MutateResult> {
  const cat = getCategory(categoryKey);
  if (!cat) return { ok: false, message: "未知的记录类别" };
  const res = await deleteRecord(categoryKey, id, config.defaultActor);
  if (res.ok) revalidateAll(categoryKey);
  return res;
}
