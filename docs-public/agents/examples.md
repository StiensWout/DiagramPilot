# Examples

These examples show the intended DiagramSpec style. They are deliberately small
so agents can copy and adapt them. Use the quickstart for the full Checkout
Demo Project workflow.

## Architecture Diagram

```yaml
version: 1
title: Checkout Architecture
direction: right
nodes:
  - id: web_app
    label: Web App
    kind: frontend
    icon: lucide:globe
  - id: api_gateway
    label: API Gateway
    kind: service
    icon: lucide:server
  - id: checkout_service
    label: Checkout Service
    kind: service
    icon: lucide:server
  - id: orders_db
    label: Orders DB
    kind: database
    icon: lucide:database
groups:
  - id: backend
    label: Backend
    contains:
      - api_gateway
      - checkout_service
      - orders_db
edges:
  - id: web_app_to_api_gateway
    from: web_app
    to: api_gateway
    label: HTTPS
  - id: api_gateway_to_checkout_service
    from: api_gateway
    to: checkout_service
    label: forwards request
  - id: checkout_service_to_orders_db
    from: checkout_service
    to: orders_db
    label: stores order
```

## Flowchart

```yaml
version: 1
title: Login Flow
direction: down
nodes:
  - id: start
    label: User submits credentials
    kind: start
    icon: lucide:circle-play
  - id: validate_credentials
    label: Validate credentials
    kind: process
    icon: lucide:shield-check
  - id: valid_credentials
    label: Credentials valid?
    kind: decision
    icon: lucide:diamond
  - id: create_session
    label: Create session
    kind: process
    icon: lucide:key-round
  - id: reject_login
    label: Reject login
    kind: end
    icon: lucide:circle-x
edges:
  - id: start_to_validate_credentials
    from: start
    to: validate_credentials
  - id: validate_credentials_to_valid_credentials
    from: validate_credentials
    to: valid_credentials
  - id: valid_credentials_to_create_session
    from: valid_credentials
    to: create_session
    label: yes
  - id: valid_credentials_to_reject_login
    from: valid_credentials
    to: reject_login
    label: no
```

## Dependency Graph

```yaml
version: 1
title: Package Dependencies
direction: right
nodes:
  - id: cli
    label: packages/cli
    kind: package
    icon: lucide:terminal
  - id: core
    label: packages/core
    kind: package
    icon: lucide:box
  - id: render_svg
    label: packages/render-svg
    kind: package
    icon: lucide:file-image
  - id: export_mermaid
    label: packages/export-mermaid
    kind: package
    icon: lucide:file-code
  - id: export_d2
    label: packages/export-d2
    kind: package
    icon: lucide:file-code
  - id: export_dot
    label: packages/export-dot
    kind: package
    icon: lucide:file-code
  - id: icons
    label: packages/icons
    kind: package
    icon: lucide:shapes
edges:
  - id: cli_to_core
    from: cli
    to: core
  - id: cli_to_render_svg
    from: cli
    to: render_svg
  - id: cli_to_export_mermaid
    from: cli
    to: export_mermaid
  - id: cli_to_export_d2
    from: cli
    to: export_d2
  - id: cli_to_export_dot
    from: cli
    to: export_dot
  - id: render_svg_to_export_d2
    from: render_svg
    to: export_d2
  - id: render_svg_to_core
    from: render_svg
    to: core
  - id: export_mermaid_to_core
    from: export_mermaid
    to: core
  - id: export_d2_to_core
    from: export_d2
    to: core
  - id: export_dot_to_core
    from: export_dot
    to: core
  - id: core_to_icons
    from: core
    to: icons
```

## Nested Groups

```yaml
version: 1
title: Platform Overview
direction: right
nodes:
  - id: web_app
    label: Web App
    kind: frontend
  - id: api_gateway
    label: API Gateway
    kind: service
  - id: worker
    label: Worker
    kind: service
  - id: jobs_queue
    label: Jobs Queue
    kind: queue
groups:
  - id: services
    label: Services
    contains:
      - api_gateway
      - worker
  - id: backend
    label: Backend
    contains:
      - services
      - jobs_queue
edges:
  - id: web_app_to_api_gateway
    from: web_app
    to: api_gateway
    label: HTTPS
  - id: api_gateway_to_jobs_queue
    from: api_gateway
    to: jobs_queue
    label: enqueues job
  - id: jobs_queue_to_worker
    from: jobs_queue
    to: worker
    label: consumed by
```
