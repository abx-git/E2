/** Published package + GitHub install source for CLI copy hints in the UI. */
export const E2_GITHUB_PKG = "github:abx-git/E2" as const;
export const E2_NPM_PKG = "event-storming-tool" as const;

export const E2_VIEWER_DOCS_URL =
  "https://github.com/abx-git/E2/blob/main/docs/VIEWER.md" as const;

export type E2InstallCommandSet = {
  globalInstallGithub: string;
  globalInstallNpm: string;
  npxViewer: string;
  npxExportJson: string;
  globalViewer: string;
  globalExportSvg: string;
};

export function buildE2InstallCommands(boardFile = "board.e2.json"): E2InstallCommandSet {
  const file = boardFile.trim() || "board.e2.json";
  const stem = file.replace(/\.(e2|storm)\.json$/i, "").replace(/\.json$/i, "") || "board";
  return {
    globalInstallGithub: `npm install -g ${E2_GITHUB_PKG}`,
    globalInstallNpm: `npm install -g ${E2_NPM_PKG}`,
    npxViewer: `npx ${E2_GITHUB_PKG} -- ${file}`,
    npxExportJson: `npx ${E2_GITHUB_PKG} -- ${file} --export json`,
    globalViewer: `e2 ${file}`,
    globalExportSvg: `e2 ${file} --export svg -o ${stem}.drawio.svg`,
  };
}
