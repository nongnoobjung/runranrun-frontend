import { describe, expect, it } from "vitest";
import { billingOf, validTaxId } from "../billing";

const msg = { name: "name", taxId: "taxId", branchNo: "branchNo", address: "address" };

function form(values: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(values)) fd.set(`b.${k}`, v);
  return fd;
}

describe("tax invoice details", () => {
  it("checks the tax ID's checksum digit", () => {
    expect(validTaxId("0105556123453")).toBe(true);
    expect(validTaxId("0105556123454")).toBe(false);
    expect(validTaxId("010555612345")).toBe(false);
  });

  it("reads a head office, a branch and a person", () => {
    const base = { name: "บริษัท วิ่งดี จำกัด", taxId: "0-1055-56123-45-3", address: "99 ถนนพระราม 4 กรุงเทพมหานคร 10500" };
    const errors: Record<string, string> = {};
    expect(billingOf(form({ ...base, kind: "head_office" }), "b", errors, msg)).toEqual({ ...base, taxId: "0105556123453", branch: "00000" });
    expect(billingOf(form({ ...base, kind: "branch", branchNo: "00012" }), "b", errors, msg).branch).toBe("00012");
    expect(billingOf(form({ ...base, kind: "person" }), "b", errors, msg).branch).toBeNull();
    expect(errors).toEqual({});
  });

  it("notes every field that is wrong", () => {
    const errors: Record<string, string> = {};
    billingOf(form({ name: "", taxId: "123", kind: "branch", branchNo: "12", address: "สั้น" }), "b", errors, msg);
    expect(errors).toEqual({ "b.name": "name", "b.taxId": "taxId", "b.branchNo": "branchNo", "b.address": "address" });
  });
});
