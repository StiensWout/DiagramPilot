# Icons Are Namespaced MVP References

DiagramSpec includes icons in the MVP as namespaced references rather than
unqualified names. Namespaces such as `aws` or `lucide` avoid collisions between
icon sets and let validation distinguish supported built-in icons from future
custom icon sources.
