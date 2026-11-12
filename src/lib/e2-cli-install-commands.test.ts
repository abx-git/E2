import { describe, expect, it } from "vitest";

import { buildE2InstallCommands } from "@/lib/e2-cli-install-commands";

describe("e2-cli-install-commands", () => {
  it("builds install hints with board file name", () => {
    const c = buildE2InstallCommands("demo.e2.json");
    expect(c.npxViewer).toContain("demo.e2.json");
    expect(c.globalExportSvg).toContain("demo.drawio.svg");
    expect(c.globalInstallGithub).toContain("github:abx-git/E2");
  });
});
