import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;

describe("txguard scan registry", () => {
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