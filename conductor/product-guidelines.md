# Product Guidelines - FMG: Free Mapgenie PRO!

## Tone and Voice
The project maintains a **Direct and Technical** tone. Documentation and user-facing messages should be concise, focusing on functionality, technical requirements, and clear implementation details. Avoid unnecessary marketing language; prioritize accuracy and clarity for a developer and power-user audience.

## Privacy and Security Messaging
Privacy is a core pillar of FMG. All communications must be **Transparent and Explicit** regarding data handling:
- Clearly state that all user data (marker progress, settings) is stored **exclusively in the local browser storage**.
- Explicitly confirm that no data is transmitted to external servers or third-party trackers.
- Provide clear instructions on how users can manage, backup (export), and delete their local data.

## Visual Identity and UI Design
The extension employs a **Modern and Clean** visual aesthetic. 
- **Popup UI:** Should utilize modern design principles (similar to Material Design or Bootstrap) to provide a polished, professional interface.
- **Consistency:** While distinct from the Mapgenie website, the UI should remain functional and uncluttered.
- **Icons:** Use clear, scalable vector graphics that represent the extension's utility and brand.

## Development and Maintenance Priority
Development is **Performance-Centric**. 
- **Optimization:** Code should be optimized for execution speed and minimal memory footprint to ensure no noticeable impact on browser performance.
- **Efficiency:** Prioritize efficient DOM manipulation and storage access patterns.
- **Maintenance:** Regularly audit the codebase to remove bottlenecks and ensure the extension remains lightweight.

## Error Handling and User Feedback
User feedback must be **Informative and Actionable**.
- **Alerts:** Use clear, descriptive notifications when an error occurs or a specific user action is required (e.g., "Login required to sync local data").
- **Guidance:** Every error message should ideally be accompanied by a brief step or suggestion to resolve the issue, minimizing user frustration.
