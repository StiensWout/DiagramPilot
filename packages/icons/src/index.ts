import lucideIconNodes from "lucide-static/icon-nodes.json" with { type: "json" };

export const ICONS_PACKAGE_NAME = "@diagrampilot/icons";
export const LUCIDE_ICON_NAMESPACE = "lucide";

export type LucideIconNode = readonly unknown[];

export interface PackagedLucideIconMetadata {
  namespace: typeof LUCIDE_ICON_NAMESPACE;
  name: string;
  iconNode: LucideIconNode;
}

const packagedLucideIconNodes = lucideIconNodes as Record<string, LucideIconNode>;
const packagedLucideIconNames = Object.freeze(
  Object.keys(packagedLucideIconNodes).sort(),
);
const packagedLucideIconNameSet = new Set(packagedLucideIconNames);

export function listPackagedLucideIconNames(): readonly string[] {
  return packagedLucideIconNames;
}

export function isPackagedLucideIconName(name: string): boolean {
  return packagedLucideIconNameSet.has(name);
}

export function getPackagedLucideIconMetadata(
  name: string,
): PackagedLucideIconMetadata | undefined {
  const iconNode = packagedLucideIconNodes[name];

  if (iconNode === undefined) {
    return undefined;
  }

  return {
    namespace: LUCIDE_ICON_NAMESPACE,
    name,
    iconNode,
  };
}
