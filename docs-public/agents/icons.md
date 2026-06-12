# Icon Reference

DiagramPilot supports packaged Lucide icons for nodes and groups. The supported
packaged icon namespace is `lucide:*`.

Use the local CLI to discover valid icon references without leaving the
repository:

```bash
diagrampilot icons list
diagrampilot icons search database
diagrampilot icons search server
```

Both commands print one `lucide:<name>` reference per line in stable order.
`icons search <query>` matches packaged Lucide icon names by substring and does
not use the network.

Common valid references:

```yaml
icon: lucide:database
icon: lucide:server
icon: lucide:globe
icon: lucide:shopping-cart
icon: lucide:credit-card
icon: lucide:package-check
icon: lucide:git-pull-request
icon: lucide:workflow
icon: lucide:boxes
icon: lucide:file-code
```

Validation rejects unsupported namespaces and unknown packaged Lucide names.
When validation reports an unknown icon, search for a nearby term and replace
the source value with one of the printed `lucide:*` references:

```bash
diagrampilot icons search data
diagrampilot validate docs/architecture.dp.yaml
```

Reserved namespaces such as `aws`, `gcp`, `azure`, and `custom` are not
supported packaged icon namespaces.
