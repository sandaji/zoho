Role & Task: You are an expert Enterprise Logistics & Software Architect. Please review the attached code to verify if the Fleet & Driver Dispatch (fleet) workflow and its corresponding API endpoints are fully and correctly implemented.

Requirements Checklist to Audit:
Vehicle & Rider Assignment:

Data Schema: Are vehicle_id, driver_id, vehicle_type (e.g., van, truck, motorbike), and dispatch_status present in the database model or request payload?

Assignment Logic: Is there a route/handler to assign or reassign single sales orders or bulk store transfers to a vehicle/driver?

Validation: Does the code validate driver availability or vehicle capacity before completing the assignment?

Proof of Delivery (POD):

Payload Handling: Does the endpoint accept digital signatures (base64/string), delivery OTP verification codes, or uploaded photo URLs?

State Mutation: Does submitting a valid POD automatically update the order status from IN_TRANSIT/DISPATCHED to DELIVERED?

Verification Guardrails: Is there backend validation preventing mark-as-delivered without attached POD metadata?

Returns to Base (RTO) & Credit Notes Integration:

Rejection Workflow: Does the endpoint accommodate rejected/failed deliveries (e.g., status REJECTED or RETURNED_TO_BASE)?

Downstream Integration: When a delivery is rejected, does the logic automatically trigger a hook/event to generate a entry in credit_notes or direct stock back to quarantine/warehouse inspection?

Expected Output Structure:
Implementation Status Table: Mark each requirement as Fully Implemented, Partially Implemented, or Missing.

Code Walkthrough: Reference the specific line numbers/functions handling each task.

Gaps & Edge Cases: Highlight unhandled edge cases (e.g., missing OTP validation, broken status transitions, or unhandled file uploads).

Fixes & Refactoring: Provide concrete code updates or missing snippets required to make the endpoint production-ready.