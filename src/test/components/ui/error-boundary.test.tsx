import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const ThrowOnRender = ({ message }: { message: string }) => {
  throw new Error(message);
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders children when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>all good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("renders default fallback when child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="boom" />
      </ErrorBoundary>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("calls custom fallback render function with error and reset", () => {
    const fallback = vi.fn((error: Error, reset: () => void) => (
      <div>
        <span>Error: {error.message}</span>
        <button onClick={reset}>Retry</button>
      </div>
    ));

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowOnRender message="boom" />
      </ErrorBoundary>
    );

    expect(screen.getByText("Error: boom")).toBeInTheDocument();
    expect(fallback).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
      expect.any(Function)
    );
  });

  it("renders static fallback element", () => {
    render(
      <ErrorBoundary fallback={<div>custom fallback</div>}>
        <ThrowOnRender message="boom" />
      </ErrorBoundary>
    );
    expect(screen.getByText("custom fallback")).toBeInTheDocument();
  });

  it("resets when 'Try again' is clicked", () => {
    let shouldThrow = true;

    function FlakyComponent() {
      if (shouldThrow) {
        throw new Error("flaky");
      }
      return <div>recovered</div>;
    }

    render(
      <ErrorBoundary>
        <FlakyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    fireEvent.click(screen.getByText("Try again"));

    expect(screen.getByText("recovered")).toBeInTheDocument();
  });

  it("resets when resetKeys change", () => {
    let shouldThrow = true;

    function FlakyComponent() {
      if (shouldThrow) {
        throw new Error("flaky");
      }
      return <div>recovered</div>;
    }

    const { rerender } = render(
      <ErrorBoundary resetKeys={[1]}>
        <FlakyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    shouldThrow = false;
    rerender(
      <ErrorBoundary resetKeys={[2]}>
        <FlakyComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText("recovered")).toBeInTheDocument();
  });

  it("calls onError when child throws", () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowOnRender message="boom" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "boom" }),
      expect.anything()
    );
  });
});
