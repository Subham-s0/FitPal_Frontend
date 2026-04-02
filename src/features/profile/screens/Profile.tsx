// Re-export ProfileContainer as default Profile component
// The old Profile.tsx has been refactored into modular components:
// - ProfileImageSection.tsx - Handles profile image upload/delete independently
// - ProfileInfoSection.tsx - Handles personal information with edit/save pattern
// - ProfileGoalsSection.tsx - Handles fitness goals with edit/save pattern
// - ProfileContainer.tsx - Orchestrates all sections and handles routing/tabs
export { default } from "./ProfileContainer";

