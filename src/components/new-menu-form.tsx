"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBlankMenuAction } from "@/lib/actions";
import { toISODate } from "@/lib/utils";
import type { AgeGroupVM, SchoolVM } from "@/lib/view-types";

export function NewMenuForm({ schools, ageGroups }: { schools: SchoolVM[]; ageGroups: AgeGroupVM[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const campuses = schools.flatMap((s) => s.campuses.map((c) => ({ ...c, schoolName: s.name })));
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? "");
  const [ageGroupId, setAgeGroupId] = useState(ageGroups[0]?.id ?? "");
  const [startDate, setStartDate] = useState(toISODate(new Date()));
  const [name, setName] = useState("");
  const [servings, setServings] = useState(120);
  const [message, setMessage] = useState<string | null>(null);

  const disabled = campuses.length === 0;

  return (
    <div className="grid gap-3 md:grid-cols-5">
      <div className="md:col-span-1">
        <Label className="mb-1 block text-xs">校区</Label>
        <Select value={campusId} onValueChange={setCampusId} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder="选择校区" />
          </SelectTrigger>
          <SelectContent>
            {campuses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.schoolName} · {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1">
        <Label className="mb-1 block text-xs">年龄组</Label>
        <Select value={ageGroupId} onValueChange={setAgeGroupId}>
          <SelectTrigger>
            <SelectValue placeholder="选择年龄组" />
          </SelectTrigger>
          <SelectContent>
            {ageGroups.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="md:col-span-1">
        <Label className="mb-1 block text-xs">周起始日</Label>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>
      <div className="md:col-span-1">
        <Label className="mb-1 block text-xs">名称（可选）</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：第1周食谱" />
      </div>
      <div className="flex items-end gap-2 md:col-span-1">
        <div className="flex-1">
          <Label className="mb-1 block text-xs">默认人数</Label>
          <Input
            type="number"
            value={servings}
            min={1}
            onChange={(e) => setServings(Number(e.target.value))}
          />
        </div>
        <Button
          disabled={disabled || pending}
          onClick={() =>
            startTransition(async () => {
              const res = await createBlankMenuAction({
                campusId,
                ageGroupId: ageGroupId || null,
                startDate,
                name,
                defaultServings: servings,
              });
              setMessage(res.message);
              if (res.ok && res.menuId) router.push(`/menus/${res.menuId}`);
            })
          }
        >
          {pending ? "创建中…" : "新建周食谱"}
        </Button>
      </div>
      {message && <p className="text-xs text-muted-foreground md:col-span-5">{message}</p>}
      {disabled && <p className="text-xs text-destructive md:col-span-5">尚未配置校区，请先到“基础设置”添加学校与校区。</p>}
    </div>
  );
}
