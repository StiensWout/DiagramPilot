# DiagramSpec IDs Are Globally Unique

DiagramSpec uses one ID namespace across nodes, edges, and groups. This makes
agent repairs, validation messages, and future structured tool operations less
ambiguous than type-scoped IDs, at the cost of requiring each object ID to be
unique across the whole diagram.
