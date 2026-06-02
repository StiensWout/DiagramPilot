# DiagramSpec IDs Use Lowercase Snake Case

DiagramSpec IDs must use lowercase snake case so agents can generate, repair,
and compare diagram objects predictably. The accepted pattern is
`^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$`, which is stricter than many renderer
formats but avoids ambiguous casing, punctuation, and whitespace in references.
