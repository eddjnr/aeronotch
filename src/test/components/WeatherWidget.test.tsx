import { render } from "@testing-library/react";
import { getWeatherIcon } from "@/components/widgets/WeatherWidget";

describe("getWeatherIcon", () => {
  it("returns Sun icon for clear/mainly clear sky when isDay is true", () => {
    const { container } = render(getWeatherIcon(0, true));
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("reicon");
  });

  it("returns Moon icon for clear/mainly clear sky when isDay is false", () => {
    const { container } = render(getWeatherIcon(0, false));
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("reicon");
  });

  it("returns CloudSun icon for partly cloudy when isDay is true", () => {
    const { container } = render(getWeatherIcon(2, true));
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("reicon");
    expect(svg).toHaveClass("text-amber-400/80!");
  });

  it("returns CloudMoon icon for partly cloudy when isDay is false", () => {
    const { container } = render(getWeatherIcon(2, false));
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("reicon");
    expect(svg).toHaveClass("text-indigo-300/80!");
  });

  it("returns Cloud icon for overcast code", () => {
    const { container } = render(getWeatherIcon(3, true));
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass("reicon");
    expect(svg).toHaveClass("text-white/60!");
  });
});
