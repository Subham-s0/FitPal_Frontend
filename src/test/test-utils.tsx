import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface RenderWithProvidersOptions {
  route?: string;
  queryClient?: QueryClient;
  wrapper?: (children: ReactNode) => ReactElement;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
) {
  const queryClient = options.queryClient ?? createTestQueryClient();
  const route = options.route ?? "/";

  const view = render(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        {options.wrapper ? options.wrapper(ui) : ui}
      </QueryClientProvider>
    </MemoryRouter>,
  );

  return {
    ...view,
    queryClient,
  };
}
