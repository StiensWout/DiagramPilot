import type { RepoWorkflowArtifactOutputFormat } from "./repo-workflow-config.js";
import type {
  StaleSvgArtifactResult,
  SvgArtifactProvenance,
} from "./svg-artifact-freshness.js";

export type ConfiguredTextArtifactFormat = "mermaid" | "d2" | "dot";

export type MarkdownEmbedReferenceIssueStatus =
  | "stale"
  | "missing-artifact"
  | "unreadable-artifact"
  | "malformed-artifact"
  | "missing-provenance"
  | "unchecked";

export type MarkdownEmbedStaleReason =
  | "content-mismatch"
  | "referenced-artifact-missing"
  | "referenced-artifact-stale"
  | "referenced-artifact-unreadable"
  | "referenced-artifact-unchecked";

export interface MarkdownEmbedReferencedArtifactIssue {
  format: RepoWorkflowArtifactOutputFormat;
  path: string;
  status: MarkdownEmbedReferenceIssueStatus;
}

export type RepoWorkflowCheckConfiguredArtifactResult =
  | {
      format: RepoWorkflowArtifactOutputFormat;
      status: "fresh";
      path: string;
      freshness: "presence-only" | "content";
    }
  | {
      format: RepoWorkflowArtifactOutputFormat;
      status: "fresh";
      path: string;
      provenance: SvgArtifactProvenance;
    }
  | {
      format: RepoWorkflowArtifactOutputFormat;
      status: "stale";
      path: string;
      reasons: readonly ["content-mismatch"];
      expectedSha256: string;
      actualSha256: string;
    }
  | {
      format: "markdown";
      status: "stale";
      path: string;
      reasons: readonly MarkdownEmbedStaleReason[];
      expectedSha256?: string;
      actualSha256?: string;
      references: readonly MarkdownEmbedReferencedArtifactIssue[];
    }
  | {
      format: RepoWorkflowArtifactOutputFormat;
      status: "stale";
      path: string;
      reasons: StaleSvgArtifactResult["reasons"];
      expected: StaleSvgArtifactResult["expected"];
      actual: StaleSvgArtifactResult["actual"];
    }
  | {
      format: RepoWorkflowArtifactOutputFormat;
      status: "missing-artifact";
      path: string;
    }
  | {
      format: RepoWorkflowArtifactOutputFormat;
      status: "malformed-artifact" | "missing-provenance";
      path: string;
      message?: string;
    }
  | {
      format: RepoWorkflowArtifactOutputFormat;
      status: "unreadable-artifact";
      path: string;
      message: string;
    }
  | {
      format: RepoWorkflowArtifactOutputFormat;
      status: "unchecked";
      path: string;
      message: string;
    };
