import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("txguard scan registry", () => {
  it("accepts both inclusive score boundaries", () => {
    for (const score of [0, 100]) {
      const result = simnet.callPublicFn("registry", "log-scan", [Cl.stringAscii("ethereum"), Cl.stringAscii("boundary-test"), Cl.uint(score)], wallet1);
      expect(result.result).toBeOk(Cl.uint(score === 0 ? 0 : 1));
    }
  });

  it("rejected scores do not mutate storage or counters", () => {
    simnet.callPublicFn("registry", "log-scan", [Cl.stringAscii("ethereum"), Cl.stringAscii("invalid"), Cl.uint(101)], wallet1);
    expect(simnet.callReadOnlyFn("registry", "get-total-scans", [], deployer).result).toBeUint(0);
    expect(simnet.callReadOnlyFn("registry", "get-scan", [Cl.uint(0)], deployer).result).toBeNone();
  });

  it("has no authorization or replay protection by design", () => {
    const wallet2 = accounts.get("wallet_2")!;
    const args = [Cl.stringAscii("stacks"), Cl.stringAscii("public-assertion"), Cl.uint(42)];
    expect(simnet.callPublicFn("registry", "log-scan", args, wallet1).result).toBeOk(Cl.uint(0));
    expect(simnet.callPublicFn("registry", "log-scan", args, wallet2).result).toBeOk(Cl.uint(1));
    expect(simnet.callReadOnlyFn("registry", "get-scan-count", args.slice(0, 2), deployer).result).toBeUint(2);
  });

  it("accepts empty unvalidated chain and target strings; entries are not certification", () => {
    expect(simnet.callPublicFn("registry", "log-scan", [Cl.stringAscii(""), Cl.stringAscii(""), Cl.uint(0)], wallet1).result).toBeOk(Cl.uint(0));
  });

  it("accepts the exact ABI string limits", () => {
    expect(simnet.callPublicFn("registry", "log-scan", [Cl.stringAscii("a".repeat(16)), Cl.stringAscii("b".repeat(64)), Cl.uint(50)], wallet1).result).toBeOk(Cl.uint(0));
  });

  it("rejects oversized target arguments at the VM boundary", () => {
    expect(() => simnet.callPublicFn("registry", "log-scan", [Cl.stringAscii("ethereum"), Cl.stringAscii("b".repeat(65)), Cl.uint(50)], wallet1)).toThrow();
  });

  it("starts with zero total scans", () => {
    const result = simnet.callReadOnlyFn("registry", "get-total-scans", [], deployer);
    expect(result.result).toBeUint(0);
  });

  it("logs a scan and returns the new scan id", () => {
    const result = simnet.callPublicFn(
      "registry",
      "log-scan",
      [Cl.stringAscii("ethereum"), Cl.stringAscii("0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e"), Cl.uint(72)],
      wallet1
    );
    expect(result.result).toBeOk(Cl.uint(0));
  });

  it("rejects a risk score above 100", () => {
    const result = simnet.callPublicFn(
      "registry",
      "log-scan",
      [Cl.stringAscii("bitcoin"), Cl.stringAscii("bc1qxy...0wlh"), Cl.uint(150)],
      wallet1
    );
    expect(result.result).toBeErr(Cl.uint(100));
  });

  it("retrieves a logged scan by id", () => {
    simnet.callPublicFn(
      "registry",
      "log-scan",
      [Cl.stringAscii("ethereum"), Cl.stringAscii("0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e"), Cl.uint(72)],
      wallet1
    );
    const result = simnet.callReadOnlyFn("registry", "get-scan", [Cl.uint(0)], deployer);
    expect(result.result).toBeSome(
      Cl.tuple({
        chain: Cl.stringAscii("ethereum"),
        target: Cl.stringAscii("0x742d35Cc6634C0532925a3b8D4C9E4f27F9cA5e"),
        "risk-score": Cl.uint(72),
        "submitted-by": Cl.principal(wallet1),
        "block-height": Cl.uint(simnet.blockHeight),
      })
    );
  });

  it("increments the per-target scan count", () => {
    simnet.callPublicFn(
      "registry",
      "log-scan",
      [Cl.stringAscii("celo"), Cl.stringAscii("0xabc...123"), Cl.uint(5)],
      wallet1
    );
    simnet.callPublicFn(
      "registry",
      "log-scan",
      [Cl.stringAscii("celo"), Cl.stringAscii("0xabc...123"), Cl.uint(8)],
      wallet1
    );
    const result = simnet.callReadOnlyFn(
      "registry",
      "get-scan-count",
      [Cl.stringAscii("celo"), Cl.stringAscii("0xabc...123")],
      deployer
    );
    expect(result.result).toBeUint(2);
  });
});
