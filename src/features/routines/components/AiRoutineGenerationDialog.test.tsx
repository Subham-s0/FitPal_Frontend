import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  AiRoutineBootstrapResponse,
  GenerateRoutineSuggestionsRequest,
} from "@/features/routines/aiRoutineTypes";
import { renderWithProviders } from "@/test/test-utils";

const aiDialogMocks = vi.hoisted(() => ({
  getAiRoutineBootstrapApi: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/features/routines/aiRoutineApi", () => ({
  aiRoutineQueryKeys: {
    bootstrap: () => ["ai-routine-bootstrap"],
  },
  getAiRoutineBootstrapApi: aiDialogMocks.getAiRoutineBootstrapApi,
}));

vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => aiDialogMocks.navigate,
  };
});

import AiRoutineGenerationDialog from "@/features/routines/components/AiRoutineGenerationDialog";

const buildBootstrap = (
  overrides: Partial<AiRoutineBootstrapResponse> = {},
): AiRoutineBootstrapResponse => ({
  canGenerate: true,
  missingProfileFields: [],
  profileSummary: {
    gender: "MALE",
    weight: 72,
    height: 175,
    fitnessLevel: "INTERMEDIATE",
    primaryFitnessFocus: "STRENGTH_POWER",
  },
  strengthSnapshot: {
    benchPress: {
      estimated1rm: 100,
      bestSetWeight: 80,
      bestSetReps: 5,
      source: "WORKOUT_HISTORY",
    },
    squat: null,
    deadlift: null,
    shoulderPress: null,
  },
  liftsMissingSnapshot: [],
  ...overrides,
});

describe("AiRoutineGenerationDialog (FE-AI-01)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks generation when the readiness bootstrap reports missing profile fields", async () => {
    const user = userEvent.setup();
    aiDialogMocks.getAiRoutineBootstrapApi.mockResolvedValue(
      buildBootstrap({
        canGenerate: false,
        missingProfileFields: ["height", "gender"],
      }),
    );

    renderWithProviders(
      <AiRoutineGenerationDialog
        open
        onOpenChange={vi.fn()}
        onGenerateRequest={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("Profile incomplete for AI generation"),
    ).toBeInTheDocument();
    expect(screen.getByText("Height")).toBeInTheDocument();
    expect(screen.getByText("Gender")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /complete profile/i }));

    expect(aiDialogMocks.navigate).toHaveBeenCalledWith("/profile?tab=goals");
  });

  it("builds the AI generation request from the guided questions", async () => {
    const user = userEvent.setup();
    const onGenerateRequest = vi.fn<
      (request: GenerateRoutineSuggestionsRequest) => void
    >();
    aiDialogMocks.getAiRoutineBootstrapApi.mockResolvedValue(
      buildBootstrap({
        liftsMissingSnapshot: ["SQUAT"],
      }),
    );

    renderWithProviders(
      <AiRoutineGenerationDialog
        open
        onOpenChange={vi.fn()}
        onGenerateRequest={onGenerateRequest}
      />,
    );

    expect(await screen.findByText(/training days/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/training days/i), "4");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await user.click(screen.getByText("Dumbbell"));
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await user.click(
      screen.getByText(/i know my squat working set/i),
    );
    await user.type(screen.getByPlaceholderText("80"), "90");
    await user.type(screen.getByPlaceholderText("5"), "5");
    await user.click(screen.getByRole("button", { name: /^next$/i }));

    await user.click(screen.getByRole("button", { name: /generate with ai/i }));

    await waitFor(() => {
      expect(onGenerateRequest).toHaveBeenCalledWith({
        daysPerWeek: 4,
        equipmentPreferences: ["DUMBBELL"],
        routineGoal: "STRENGTH_POWER",
        strengthInputs: {
          benchPress: null,
          squat: { weight: 90, reps: 5, unit: "KG" },
          deadlift: null,
          shoulderPress: null,
        },
      });
    });
  });
});
