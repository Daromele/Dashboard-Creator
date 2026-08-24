"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Callout, Card, Field, Input, Select } from "@/components/ui";
import { apiRequest } from "@/lib/client";
import { PAY_FREQUENCIES } from "@/lib/labels";

export interface SetupValues {
  clientName: string;
  selectedMonth: string;
  payFrequency: string;
  takeHomePayPerCheck: string;
  nextPayday: string;
  savingsRateTarget: string;
  minimumCashCushion: string;
  estimatedAnnualTaxLiability: string;
  incomeTaxWithheldYTD: string;
  regularWithholdingPerCheck: string;
  additionalWithholdingPerCheck: string;
  remainingPaychecks: string;
  desiredTaxBuffer: string;
}

export function SetupForm({ initial }: { initial: SetupValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof SetupValues>(key: K, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
    setStatus("idle");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setStatus("saving");
    try {
      await apiRequest("/api/settings", {
        method: "PATCH",
        body: {
          clientName: values.clientName,
          selectedMonth: values.selectedMonth,
          payFrequency: values.payFrequency || null,
          takeHomePayPerCheck: values.takeHomePayPerCheck,
          nextPayday: values.nextPayday,
          savingsRateTarget: values.savingsRateTarget,
          minimumCashCushion: values.minimumCashCushion,
          estimatedAnnualTaxLiability: values.estimatedAnnualTaxLiability,
          incomeTaxWithheldYTD: values.incomeTaxWithheldYTD,
          regularWithholdingPerCheck: values.regularWithholdingPerCheck,
          additionalWithholdingPerCheck: values.additionalWithholdingPerCheck,
          remainingPaychecks: values.remainingPaychecks,
          desiredTaxBuffer: values.desiredTaxBuffer,
        },
      });
      setStatus("saved");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save");
      setStatus("idle");
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <Card title="You and your month">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Client name">
            <Input
              required
              value={values.clientName}
              onChange={(event) => set("clientName", event.target.value)}
            />
          </Field>
          <Field label="Budget month" hint="Every screen reports on this month.">
            <Input
              type="month"
              required
              value={values.selectedMonth}
              onChange={(event) => set("selectedMonth", event.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card title="Payroll">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Pay frequency">
            <Select
              value={values.payFrequency}
              onChange={(event) => set("payFrequency", event.target.value)}
            >
              <option value="">Not set</option>
              {PAY_FREQUENCIES.map((frequency) => (
                <option key={frequency} value={frequency}>
                  {frequency}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Take-home pay per check">
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={values.takeHomePayPerCheck}
              onChange={(event) => set("takeHomePayPerCheck", event.target.value)}
            />
          </Field>
          <Field label="Next payday" hint="Drives the Next Check Left KPI.">
            <Input
              type="date"
              value={values.nextPayday}
              onChange={(event) => set("nextPayday", event.target.value)}
            />
          </Field>
          <Field label="Savings rate target" hint="Percent of each check, e.g. 10">
            <Input
              inputMode="decimal"
              placeholder="10"
              value={values.savingsRateTarget}
              onChange={(event) => set("savingsRateTarget", event.target.value)}
            />
          </Field>
          <Field label="Minimum cash cushion">
            <Input
              inputMode="decimal"
              placeholder="0.00"
              value={values.minimumCashCushion}
              onChange={(event) => set("minimumCashCushion", event.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card
        title="Tax assumptions"
        description="Used only by the Withholding Check. Leave blank until you have real numbers."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Estimated annual tax liability">
            <Input
              inputMode="decimal"
              value={values.estimatedAnnualTaxLiability}
              onChange={(event) => set("estimatedAnnualTaxLiability", event.target.value)}
            />
          </Field>
          <Field label="Income tax withheld year-to-date">
            <Input
              inputMode="decimal"
              value={values.incomeTaxWithheldYTD}
              onChange={(event) => set("incomeTaxWithheldYTD", event.target.value)}
            />
          </Field>
          <Field label="Regular withholding per check">
            <Input
              inputMode="decimal"
              value={values.regularWithholdingPerCheck}
              onChange={(event) => set("regularWithholdingPerCheck", event.target.value)}
            />
          </Field>
          <Field label="Additional withholding per check">
            <Input
              inputMode="decimal"
              value={values.additionalWithholdingPerCheck}
              onChange={(event) => set("additionalWithholdingPerCheck", event.target.value)}
            />
          </Field>
          <Field label="Remaining paychecks this year" hint="Whole number, 0 or more.">
            <Input
              inputMode="numeric"
              value={values.remainingPaychecks}
              onChange={(event) => set("remainingPaychecks", event.target.value)}
            />
          </Field>
          <Field label="Desired tax safety buffer">
            <Input
              inputMode="decimal"
              value={values.desiredTaxBuffer}
              onChange={(event) => set("desiredTaxBuffer", event.target.value)}
            />
          </Field>
        </div>
      </Card>

      {error && <Callout tone="danger">{error}</Callout>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={status === "saving"}>
          {status === "saving" ? "Saving…" : "Save setup"}
        </Button>
        {status === "saved" && <span className="text-sm font-semibold text-sage-deep">Saved.</span>}
      </div>
    </form>
  );
}
