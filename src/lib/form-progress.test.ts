import { test } from "node:test";
import { strict as assert } from "node:assert";
function expect(value: unknown) { return { toBe(expected: unknown) { assert.equal(value, expected); } }; }
import { formProgress, allFormsCompleted, canAdminRead, csvCell } from "./form-progress";
const qs = [{ id: "c", module: "cognitive" }, { id: "f", module: "functional" }, { id: "r1", module: "reflex" }, { id: "r2", module: "reflex" }];
test("empty form is not started", () => expect(formProgress(qs, [])[0].status).toBe("Sin iniciar"));
test("partially answered form remains in progress", () => expect(formProgress(qs, ["r1"])[2].status).toBe("En progreso"));
test("all questions are required for completion", () => expect(formProgress(qs, ["r1", "r2"])[2].status).toBe("Completado"));
test("final page requires all three forms", () => { expect(allFormsCompleted(formProgress(qs, ["c", "f", "r1"]))).toBe(false); expect(allFormsCompleted(formProgress(qs, ["c", "f", "r1", "r2"]))).toBe(true); });
test("only administrator has access to all users", () => { expect(canAdminRead(["usuario", "neuropsicologo"])).toBe(false); expect(canAdminRead(["administrador"])).toBe(true); });
test("CSV prevents spreadsheet formula injection", () => expect(csvCell("=1+1")).toBe('"\'=1+1"'));