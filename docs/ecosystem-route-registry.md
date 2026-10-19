# ResoFit OS™ Route & Capability Registry

Routes are capabilities, not promises of deployment. A route is public only when its status is `active` and its guard requirements are satisfied.

## Public/customer capabilities
- `/packages`
- `/gift`
- `/delivery-request`
- `/white-glove-delivery-request`
- `/customization-designer`
- `/upgrade`
- `/referral`
- `/earn`
- `/agency`
- `/stream`
- `/distributor`
- `/context`

## Integration/service capabilities
- `/terminal-api-integration`
- `/delivery-platform`
- `/image-kit`
- `/payment/*`
- `/paystack/*`
- `/payment-platform/*`

## Operational capabilities
- `/auto-post`
- `/socials`
- `/agent`
- generator/edge/serverless/cloud automation
- deployment controls

Operational capabilities require authentication, role checks and appropriate environment restrictions. They must never be exposed through ordinary customer navigation.

## Route guard model
`anonymous → public`
`authenticated → member`
`admin → operational`
`service → server-to-server`

Every route must preserve member/session identity, return safe redirects, and avoid leaking protected state across domains.
