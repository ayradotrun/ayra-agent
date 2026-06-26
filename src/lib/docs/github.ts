export const GITHUB_REPO_URL = "https://github.com/ayradotrun/ayra-agent";
export const GITHUB_DOCS_TREE_URL = `${GITHUB_REPO_URL}/tree/main/docs`;

/** View a markdown guide on GitHub (rendered in the repo UI). */
export function getDocGithubUrl(fileBase: string): string {
  return `${GITHUB_REPO_URL}/blob/main/docs/${fileBase}.md`;
}
