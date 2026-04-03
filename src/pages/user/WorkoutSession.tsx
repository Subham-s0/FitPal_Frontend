import UserLayout from "@/features/user-dashboard/components/UserLayout";
import WorkoutSessionScreen from "@/features/workout-sessions/screens/WorkoutSessionScreen";

export default function WorkoutSession() {
  return (
    <UserLayout
      activeSection="workouts"
      onSectionChange={() => {}}
      contentMode="immersive"
    >
      <WorkoutSessionScreen />
    </UserLayout>
  );
}
