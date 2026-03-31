import type { Meta, StoryObj } from "@storybook/react-vite";

import GymCard from "./GymCard";

const meta = {
  title: "Components/GymCard",
  component: GymCard,
  parameters: {
    layout: "centered",
    design: {
      type: "figma",
      url: "https://www.figma.com/file/YOUR_FIGMA_FILE_ID/FitPal-UI",
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof GymCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    name: "FitPal Downtown",
    location: "Kathmandu",
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1200&auto=format&fit=crop",
    rating: 4.6,
  },
};

