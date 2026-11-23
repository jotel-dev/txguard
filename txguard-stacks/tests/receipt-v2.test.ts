import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";
const accounts = simnet.getAccounts();
const sender = accounts.get("wallet_1")!;
const other = accounts.get("wallet_2")!;
const commitment = Cl.buffer(new Uint8Array(32).fill(42));
describe("private receipt candidate (simnet only)", () => {
  it("rejects indirect registrations without writing a victim receipt", () => {
    simnet.deployContract("receipt-proxy", "(define-public (forward (hash (buff 32))) (contract-call? .receipt-v2 register hash))", null, accounts.get("deployer")!);
    expect(simnet.callPublicFn("receipt-proxy", "forward", [commitment], sender).result).toBeErr(Cl.uint(202));
    expect(simnet.callReadOnlyFn("receipt-v2", "get-receipt", [Cl.principal(sender), commitment], sender).result).toBeNone();
  });
  it("registers and independently reads the submitter-bound commitment", () => {
    expect(simnet.callPublicFn("receipt-v2", "register", [commitment], sender).result).toBeOk(commitment);
    expect(simnet.callReadOnlyFn("receipt-v2", "get-receipt", [Cl.principal(sender), commitment], other).result)
      .toBeSome(Cl.tuple({ "registered-at": Cl.uint(simnet.blockHeight) }));
  });
  it("rejects exact replay without overwriting the original block", () => {
    simnet.callPublicFn("receipt-v2", "register", [commitment], sender);
    const before = simnet.callReadOnlyFn("receipt-v2", "get-receipt", [Cl.principal(sender), commitment], sender).result;
    expect(simnet.callPublicFn("receipt-v2", "register", [commitment], sender).result).toBeErr(Cl.uint(201));
    expect(simnet.callReadOnlyFn("receipt-v2", "get-receipt", [Cl.principal(sender), commitment], sender).result).toEqual(before);
  });
  it("cannot impersonate or block another submitter by copying a commitment", () => {
    simnet.callPublicFn("receipt-v2", "register", [commitment], other);
    expect(simnet.callReadOnlyFn("receipt-v2", "get-receipt", [Cl.principal(sender), commitment], sender).result).toBeNone();
    expect(simnet.callPublicFn("receipt-v2", "register", [commitment], sender).result).toBeOk(commitment);
  });
  it("rejects empty, truncated and zero commitments atomically", () => {
    for (const value of [new Uint8Array(), new Uint8Array(31).fill(1), new Uint8Array(32)]) {
      const arg = Cl.buffer(value);
      expect(simnet.callPublicFn("receipt-v2", "register", [arg], sender).result).toBeErr(Cl.uint(200));
      expect(simnet.callReadOnlyFn("receipt-v2", "get-receipt", [Cl.principal(sender), arg], sender).result).toBeNone();
    }
  });
  it("rejects oversized commitments at the VM boundary", () => {
    expect(() => simnet.callPublicFn("receipt-v2", "register", [Cl.buffer(new Uint8Array(33))], sender)).toThrow();
  });
});
