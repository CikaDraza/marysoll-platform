// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { applyPasswordVisibility } from "./PasswordVisibilityButton";

describe("applyPasswordVisibility", () => {
  it("prvi poziv odmah prikazuje autofill password input", () => {
    const wrapper = document.createElement("div");
    const input = document.createElement("input");
    input.type = "password";
    input.value = "privremena-lozinka";
    wrapper.append(input);

    applyPasswordVisibility(wrapper, true);

    expect(input.type).toBe("text");
    expect(input.value).toBe("privremena-lozinka");
  });

  it("ponovo maskira isti input", () => {
    const wrapper = document.createElement("div");
    const input = document.createElement("input");
    input.type = "text";
    wrapper.append(input);

    applyPasswordVisibility(wrapper, false);

    expect(input.type).toBe("password");
  });
});
