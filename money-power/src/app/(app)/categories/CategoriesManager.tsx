"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Callout, Card, Field, Input, Select, Td, TableShell, Th } from "@/components/ui";
import { apiRequest } from "@/lib/client";
import { GROUPS, NEED_WANTS, PRIORITIES, PRIORITY_LABELS, WASTE_FLAGS, WASTE_FLAG_TONE } from "@/lib/labels";
import type { WasteFlag } from "@/lib/calc";

interface CategoryRow {
  id: string;
  name: string;
  group: string;
  needWant: string;
  wasteFlag: string;
  priority: string;
  active: boolean;
}

const BLANK = { name: "", group: "Flexible", needWant: "Want", wasteFlag: "Watch", priority: "Review" };

export function CategoriesManager({
  categories,
  paymentMethods,
}: {
  categories: CategoryRow[];
  paymentMethods: Array<{ id: string; name: string; active: boolean }>;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState<CategoryRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [methodName, setMethodName] = useState("");

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error && <Callout tone="danger">{error}</Callout>}

      <Card title="Add a category">
        <form
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await apiRequest("/api/categories", { method: "POST", body: draft });
              setDraft(BLANK);
            });
          }}
        >
          <Field label="Name">
            <Input
              required
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Pet Care"
            />
          </Field>
          <Field label="Group">
            <Select value={draft.group} onChange={(event) => setDraft({ ...draft, group: event.target.value })}>
              {GROUPS.map((group) => (
                <option key={group}>{group}</option>
              ))}
            </Select>
          </Field>
          <Field label="Need / Want">
            <Select
              value={draft.needWant}
              onChange={(event) => setDraft({ ...draft, needWant: event.target.value })}
            >
              {NEED_WANTS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </Field>
          <Field label="Waste flag">
            <Select
              value={draft.wasteFlag}
              onChange={(event) => setDraft({ ...draft, wasteFlag: event.target.value })}
            >
              {WASTE_FLAGS.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={busy} className="w-full">
              Add category
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Budget categories">
        <TableShell>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Group</Th>
              <Th>Need / Want</Th>
              <Th>Waste flag</Th>
              <Th>Priority</Th>
              <Th align="right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => {
              const isEditing = editingId === category.id && edit;
              return (
                <tr key={category.id} className={category.active ? "" : "opacity-60"}>
                  <Td label="Category">
                    {isEditing ? (
                      <Input value={edit.name} onChange={(event) => setEdit({ ...edit, name: event.target.value })} />
                    ) : (
                      <span className="font-medium text-charcoal">
                        {category.name}
                        {!category.active && <span className="ml-2 text-xs text-body/60">(inactive)</span>}
                      </span>
                    )}
                  </Td>
                  <Td label="Group">
                    {isEditing ? (
                      <Select value={edit.group} onChange={(event) => setEdit({ ...edit, group: event.target.value })}>
                        {GROUPS.map((group) => (
                          <option key={group}>{group}</option>
                        ))}
                      </Select>
                    ) : (
                      category.group
                    )}
                  </Td>
                  <Td label="Need / Want">
                    {isEditing ? (
                      <Select
                        value={edit.needWant}
                        onChange={(event) => setEdit({ ...edit, needWant: event.target.value })}
                      >
                        {NEED_WANTS.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </Select>
                    ) : (
                      category.needWant
                    )}
                  </Td>
                  <Td label="Waste flag">
                    {isEditing ? (
                      <Select
                        value={edit.wasteFlag}
                        onChange={(event) => setEdit({ ...edit, wasteFlag: event.target.value })}
                      >
                        {WASTE_FLAGS.map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </Select>
                    ) : (
                      <Badge tone={WASTE_FLAG_TONE[category.wasteFlag as WasteFlag]}>{category.wasteFlag}</Badge>
                    )}
                  </Td>
                  <Td label="Priority">
                    {isEditing ? (
                      <Select
                        value={edit.priority}
                        onChange={(event) => setEdit({ ...edit, priority: event.target.value })}
                      >
                        {PRIORITIES.map((value) => (
                          <option key={value} value={value}>
                            {PRIORITY_LABELS[value]}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      PRIORITY_LABELS[category.priority]
                    )}
                  </Td>
                  <Td label="Actions" align="right">
                    <div className="flex justify-end gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                              void run(async () => {
                                await apiRequest(`/api/categories/${category.id}`, {
                                  method: "PATCH",
                                  body: {
                                    name: edit.name,
                                    group: edit.group,
                                    needWant: edit.needWant,
                                    wasteFlag: edit.wasteFlag,
                                    priority: edit.priority,
                                  },
                                });
                                setEditingId(null);
                                setEdit(null);
                              })
                            }
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(null);
                              setEdit(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setEditingId(category.id);
                              setEdit(category);
                            }}
                          >
                            Edit
                          </Button>
                          {category.active ? (
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  apiRequest(`/api/categories/${category.id}`, { method: "DELETE" }),
                                )
                              }
                            >
                              Remove
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={busy}
                              onClick={() =>
                                void run(() =>
                                  apiRequest(`/api/categories/${category.id}`, {
                                    method: "PATCH",
                                    body: { active: true },
                                  }),
                                )
                              }
                            >
                              Restore
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </TableShell>
        <p className="mt-3 text-xs text-body/70">
          A category with transactions or bills attached is deactivated rather than deleted, so your
          history keeps its classification.
        </p>
      </Card>

      <Card title="Payment methods">
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await apiRequest("/api/payment-methods", { method: "POST", body: { name: methodName } });
              setMethodName("");
            });
          }}
        >
          <Field label="New payment method" className="grow sm:max-w-xs">
            <Input
              required
              value={methodName}
              onChange={(event) => setMethodName(event.target.value)}
              placeholder="Store card"
            />
          </Field>
          <Button type="submit" disabled={busy}>
            Add
          </Button>
        </form>

        <ul className="mt-4 flex flex-wrap gap-2">
          {paymentMethods.map((method) => (
            <li key={method.id}>
              <span
                className={`inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm ${
                  method.active ? "bg-white" : "bg-blush text-body/60"
                }`}
              >
                {method.name}
                <button
                  type="button"
                  aria-label={`Remove ${method.name}`}
                  className="text-body/50 hover:text-cut-text"
                  disabled={busy}
                  onClick={() =>
                    void run(() => apiRequest(`/api/payment-methods/${method.id}`, { method: "DELETE" }))
                  }
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Fixed lists" description="These choices are built in and used across the app.">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="mp-label">Group</dt>
            <dd className="text-sm">Essential · Flexible · Goals</dd>
          </div>
          <div>
            <dt className="mp-label">Need / Want</dt>
            <dd className="text-sm">Need · Want</dd>
          </div>
          <div>
            <dt className="mp-label">Waste flag</dt>
            <dd className="text-sm">Core · Protected · Watch · Cut</dd>
          </div>
          <div>
            <dt className="mp-label">Priority</dt>
            <dd className="text-sm">Cut Now · Reduce · Review · Keep</dd>
          </div>
          <div>
            <dt className="mp-label">Pay frequency</dt>
            <dd className="text-sm">Weekly · Biweekly · Semimonthly · Monthly · Irregular</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
